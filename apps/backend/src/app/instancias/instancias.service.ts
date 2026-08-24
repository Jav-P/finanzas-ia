import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  EstadoInstancia,
  InstanciaConDetalle,
  Obligacion,
  Pago,
  RegistrarPagoDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCategoria, toInstancia, toObligacion, toPago } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

const BUCKET = 'comprobantes';

// No hay FKs en el schema (decision deliberada, ver supabase/migrations),
// asi que PostgREST no puede hacer resource embedding: el join entre
// instancias/obligaciones/categorias/pagos se arma aqui, en la app.
@Injectable()
export class InstanciasService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(
    hogarId: string,
    usuarioId?: string,
    estado?: EstadoInstancia,
  ): Promise<InstanciaConDetalle[]> {
    let obligacionesQuery = this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('hogar_id', hogarId);

    if (usuarioId) {
      obligacionesQuery = obligacionesQuery.or(
        `usuario_responsable_id.eq.${usuarioId},usuario_responsable_id.is.null`,
      );
    }

    const { data: obligacionRows, error: obligacionesError } = await obligacionesQuery;
    throwIfError(obligacionesError);
    if (!obligacionRows || !obligacionRows.length) return [];

    const obligacionIds = obligacionRows.map((o) => o.id);

    let instanciasQuery = this.supabase.client
      .from('obligacion_instancias')
      .select('*')
      .in('obligacion_id', obligacionIds)
      .order('fecha_vencimiento');

    const { data: instanciaRows, error: instanciasError } = await instanciasQuery;
    throwIfError(instanciasError);
    const instancias = instanciaRows ?? [];

    const [categoriaRows, pagoRows] = await Promise.all([
      this.fetchCategorias(hogarId),
      this.fetchPagos(instancias.map((i) => i.id)),
    ]);

    const obligacionesById = new Map(obligacionRows.map((o) => [o.id, toObligacion(o)]));
    const categoriasById = new Map(categoriaRows.map((c) => [c.id, toCategoria(c)]));
    const pagosByInstancia = this.agruparPagos(pagoRows);

    const enriched = instancias.map((row) =>
      this.enrich(row, obligacionesById, categoriasById, pagosByInstancia),
    );

    return estado ? enriched.filter((i) => i.estado === estado) : enriched;
  }

  async findOne(id: string): Promise<InstanciaConDetalle> {
    const { data: instanciaRow, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    throwIfError(error);
    if (!instanciaRow) throw new NotFoundException('Instancia no encontrada');

    const { data: obligacionRow, error: obligacionError } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('id', instanciaRow.obligacion_id)
      .single();
    throwIfError(obligacionError);

    const [categoriaRows, pagoRows] = await Promise.all([
      this.fetchCategorias(obligacionRow.hogar_id),
      this.fetchPagos([id]),
    ]);

    const obligacionesById = new Map([[obligacionRow.id, toObligacion(obligacionRow)]]);
    const categoriasById = new Map(categoriaRows.map((c) => [c.id, toCategoria(c)]));
    const pagosByInstancia = this.agruparPagos(pagoRows);

    const enriched = this.enrich(instanciaRow, obligacionesById, categoriasById, pagosByInstancia);
    enriched.pagos = await Promise.all(enriched.pagos.map((p) => this.withSignedUrl(p)));

    return enriched;
  }

  async registrarPago(
    instanciaId: string,
    dto: RegistrarPagoDto,
    file: Express.Multer.File,
  ): Promise<Pago> {
    const { data: instanciaRow, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('id, monto')
      .eq('id', instanciaId)
      .maybeSingle();
    throwIfError(error);
    if (!instanciaRow) throw new NotFoundException('Instancia no encontrada');

    const yaPagado = await this.totalPagado(instanciaId);
    const restante = Number(instanciaRow.monto) - yaPagado;

    if (dto.montoPagado > restante + 0.01) {
      throw new BadRequestException(
        `El monto pagado (${dto.montoPagado}) supera lo que falta por pagar de esta obligación (${restante}). ` +
          'Si vas a dividir el pago en varios comprobantes, entre todos no pueden sumar más del total.',
      );
    }

    const path = `${instanciaId}/${Date.now()}-${file.originalname}`;
    const { error: uploadError } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    throwIfError(uploadError);

    const { data: pagoRow, error: pagoError } = await this.supabase.client
      .from('pagos')
      .insert({
        instancia_id: instanciaId,
        usuario_pago_id: dto.usuarioPagoId,
        fecha_pago: dto.fechaPago,
        monto_pagado: dto.montoPagado,
        url_comprobante: path,
      })
      .select()
      .single();
    throwIfError(pagoError);

    const nuevoTotal = yaPagado + dto.montoPagado;
    if (nuevoTotal >= Number(instanciaRow.monto) - 0.01) {
      const { error: updateError } = await this.supabase.client
        .from('obligacion_instancias')
        .update({ estado: 'pagado' })
        .eq('id', instanciaId);
      throwIfError(updateError);
    }

    return this.withSignedUrl(toPago(pagoRow));
  }

  // Elimina un comprobante puntual (y su archivo en Storage). Si la
  // instancia estaba marcada pagado (porque este comprobante era el que
  // completaba el total), vuelve a pendiente.
  async revertirPago(instanciaId: string, pagoId: string): Promise<void> {
    const { data: pagoRow, error } = await this.supabase.client
      .from('pagos')
      .select('*')
      .eq('id', pagoId)
      .eq('instancia_id', instanciaId)
      .maybeSingle();
    throwIfError(error);
    if (!pagoRow) throw new NotFoundException('Ese comprobante no existe para esta instancia');

    const { error: deleteError } = await this.supabase.client.from('pagos').delete().eq('id', pagoId);
    throwIfError(deleteError);

    if (pagoRow.url_comprobante) {
      await this.supabase.client.storage.from(BUCKET).remove([pagoRow.url_comprobante]);
    }

    const { error: updateError } = await this.supabase.client
      .from('obligacion_instancias')
      .update({ estado: 'pendiente' })
      .eq('id', instanciaId);
    throwIfError(updateError);
  }

  private async totalPagado(instanciaId: string): Promise<number> {
    const pagos = await this.fetchPagos([instanciaId]);
    return pagos.reduce((sum, p) => sum + Number(p.monto_pagado), 0);
  }

  private async withSignedUrl(pago: Pago): Promise<Pago> {
    const { data, error } = await this.supabase.client.storage
      .from(BUCKET)
      .createSignedUrl(pago.urlComprobante, 3600);
    if (error || !data) return pago;
    return { ...pago, urlComprobante: data.signedUrl };
  }

  private enrich(
    instanciaRow: any,
    obligacionesById: Map<string, Obligacion>,
    categoriasById: Map<string, ReturnType<typeof toCategoria>>,
    pagosByInstancia: Map<string, Pago[]>,
  ): InstanciaConDetalle {
    const instancia = toInstancia(instanciaRow);
    const obligacion = obligacionesById.get(instancia.obligacionId);
    if (!obligacion) {
      throw new NotFoundException(`Obligacion ${instancia.obligacionId} no encontrada`);
    }
    const categoria = categoriasById.get(obligacion.categoriaId);
    if (!categoria) {
      throw new NotFoundException(`Categoria ${obligacion.categoriaId} no encontrada`);
    }
    const pagos = pagosByInstancia.get(instancia.id) ?? [];
    const totalPagado = pagos.reduce((sum, p) => sum + p.montoPagado, 0);
    const saldoPendienteDePago = Math.max(0, instancia.monto - totalPagado);

    const estado: EstadoInstancia =
      instancia.estado === 'pendiente' && instancia.fechaVencimiento < today()
        ? 'vencido'
        : instancia.estado;

    return { ...instancia, estado, obligacion, categoria, pagos, totalPagado, saldoPendienteDePago };
  }

  private agruparPagos(pagoRows: any[]): Map<string, Pago[]> {
    const mapa = new Map<string, Pago[]>();
    for (const row of pagoRows) {
      const pago = toPago(row);
      const lista = mapa.get(pago.instanciaId) ?? [];
      lista.push(pago);
      mapa.set(pago.instanciaId, lista);
    }
    return mapa;
  }

  private async fetchCategorias(hogarId: string) {
    const { data, error } = await this.supabase.client
      .from('categorias')
      .select('*')
      .or(`hogar_id.is.null,hogar_id.eq.${hogarId}`);
    throwIfError(error);
    return data ?? [];
  }

  private async fetchPagos(instanciaIds: string[]) {
    if (!instanciaIds.length) return [];
    const { data, error } = await this.supabase.client
      .from('pagos')
      .select('*')
      .in('instancia_id', instanciaIds);
    throwIfError(error);
    return data ?? [];
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
