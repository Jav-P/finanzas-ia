import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateObligacionDto,
  Obligacion,
  UpdateObligacionDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toObligacion } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

const BUCKET_COMPROBANTES = 'comprobantes';

function firstDayOfMonth(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

@Injectable()
export class ObligacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateObligacionDto): Promise<Obligacion> {
    const { data: obligacionRow, error } = await this.supabase.client
      .from('obligaciones')
      .insert({
        hogar_id: dto.hogarId,
        usuario_responsable_id: dto.usuarioResponsableId ?? null,
        categoria_id: dto.categoriaId,
        descripcion: dto.descripcion,
        monto: dto.monto,
        recurrencia: dto.recurrencia,
        dia_vencimiento: dto.diaVencimiento ?? null,
        numero_cuotas: dto.numeroCuotas ?? null,
        fecha_inicio: dto.fechaInicio,
      })
      .select()
      .single();

    throwIfError(error);

    // La primera instancia se genera de inmediato; las siguientes (para
    // obligaciones mensuales) las genera el job recurrente (pendiente).
    const { error: instanciaError } = await this.supabase.client
      .from('obligacion_instancias')
      .insert({
        obligacion_id: obligacionRow.id,
        periodo: firstDayOfMonth(dto.fechaInicio),
        fecha_vencimiento: dto.fechaInicio,
        monto: dto.monto,
      });

    throwIfError(instanciaError);

    return toObligacion(obligacionRow);
  }

  async findOne(id: string): Promise<Obligacion> {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }

  async update(id: string, dto: UpdateObligacionDto): Promise<Obligacion> {
    const patch: Record<string, unknown> = {};
    if (dto.usuarioResponsableId !== undefined) patch['usuario_responsable_id'] = dto.usuarioResponsableId;
    if (dto.categoriaId !== undefined) patch['categoria_id'] = dto.categoriaId;
    if (dto.descripcion !== undefined) patch['descripcion'] = dto.descripcion;
    if (dto.monto !== undefined) patch['monto'] = dto.monto;
    if (dto.recurrencia !== undefined) patch['recurrencia'] = dto.recurrencia;
    if (dto.diaVencimiento !== undefined) patch['dia_vencimiento'] = dto.diaVencimiento;
    if (dto.numeroCuotas !== undefined) patch['numero_cuotas'] = dto.numeroCuotas;
    if (dto.fechaInicio !== undefined) patch['fecha_inicio'] = dto.fechaInicio;

    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }

  async desactivar(id: string): Promise<Obligacion> {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update({ activa: false })
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }

  // Elimina la obligacion junto con todas sus instancias y pagos (y los
  // comprobantes en Storage). Para "ya no aplica pero quiero conservar
  // el historial" usar desactivar() en vez de esto.
  async remove(id: string): Promise<void> {
    const { data: instanciaRows, error: instanciasError } = await this.supabase.client
      .from('obligacion_instancias')
      .select('id')
      .eq('obligacion_id', id);
    throwIfError(instanciasError);

    const instanciaIds = (instanciaRows ?? []).map((i: any) => i.id);

    if (instanciaIds.length) {
      const { data: pagoRows, error: pagosError } = await this.supabase.client
        .from('pagos')
        .select('url_comprobante')
        .in('instancia_id', instanciaIds);
      throwIfError(pagosError);

      const paths = (pagoRows ?? []).map((p: any) => p.url_comprobante).filter(Boolean);
      if (paths.length) {
        await this.supabase.client.storage.from(BUCKET_COMPROBANTES).remove(paths);
      }

      const { error: deletePagosError } = await this.supabase.client
        .from('pagos')
        .delete()
        .in('instancia_id', instanciaIds);
      throwIfError(deletePagosError);

      const { error: deleteInstanciasError } = await this.supabase.client
        .from('obligacion_instancias')
        .delete()
        .eq('obligacion_id', id);
      throwIfError(deleteInstanciasError);
    }

    const { error } = await this.supabase.client.from('obligaciones').delete().eq('id', id);
    throwIfError(error);
  }
}
