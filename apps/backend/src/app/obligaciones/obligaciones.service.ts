import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  CreateObligacionDto,
  CreditoResumen,
  GenerarInstanciasResultado,
  Obligacion,
  UpdateObligacionDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCategoria, toObligacion } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

const BUCKET_COMPROBANTES = 'comprobantes';
const UNIQUE_VIOLATION = '23505';
const TOPE_ITERACIONES = 60; // salvaguarda: max instancias a generar por obligacion en una corrida

function firstDayOfMonth(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateIso: string, dias: number): string {
  const fecha = new Date(`${dateIso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function addMonths(dateIso: string, meses: number): string {
  const fecha = new Date(`${dateIso}T00:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth() + meses);
  return fecha.toISOString().slice(0, 10);
}

@Injectable()
export class ObligacionesService {
  private readonly logger = new Logger(ObligacionesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(hogarId: string, dto: CreateObligacionDto): Promise<Obligacion> {
    const { data: obligacionRow, error } = await this.supabase.client
      .from('obligaciones')
      .insert({
        hogar_id: hogarId,
        usuario_responsable_id: dto.usuarioResponsableId ?? null,
        categoria_id: dto.categoriaId,
        descripcion: dto.descripcion,
        monto: dto.monto,
        recurrencia: dto.recurrencia,
        dia_vencimiento: dto.diaVencimiento ?? null,
        numero_cuotas: dto.numeroCuotas ?? null,
        fecha_inicio: dto.fechaInicio,
        banco: dto.banco ?? null,
        tasa_interes: dto.tasaInteres ?? null,
        saldo_pendiente: dto.saldoPendiente ?? null,
        saldo_actualizado_en: dto.saldoPendiente != null ? hoyIso() : null,
      })
      .select()
      .single();

    throwIfError(error);

    // La primera instancia se genera de inmediato; las siguientes (para
    // obligaciones mensuales/diarias) las genera generarPendientes().
    const periodo =
      dto.recurrencia === 'diaria' ? dto.fechaInicio : firstDayOfMonth(dto.fechaInicio);

    const { error: instanciaError } = await this.supabase.client
      .from('obligacion_instancias')
      .insert({
        obligacion_id: obligacionRow.id,
        periodo,
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
    if (dto.banco !== undefined) patch['banco'] = dto.banco;
    if (dto.tasaInteres !== undefined) patch['tasa_interes'] = dto.tasaInteres;
    if (dto.saldoPendiente !== undefined) {
      patch['saldo_pendiente'] = dto.saldoPendiente;
      patch['saldo_actualizado_en'] = dto.saldoPendiente != null ? hoyIso() : null;
    }

    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');

    // La(s) instancia(s) ya generadas no se recalculan solas: el monto y
    // la fecha de vencimiento se copian al crearse (para no alterar el
    // historial de cuotas ya pasadas). Pero si esta obligacion todavia
    // tiene una unica instancia sin pagar (tipicamente: se acaba de crear
    // y el usuario esta corrigiendo un error de fecha/monto), la
    // sincronizamos con el nuevo valor para que el cambio se vea reflejado.
    if (dto.fechaInicio !== undefined || dto.monto !== undefined) {
      await this.sincronizarInstanciaUnicaPendiente(toObligacion(data));
    }

    return toObligacion(data);
  }

  private async sincronizarInstanciaUnicaPendiente(obligacion: Obligacion): Promise<void> {
    const { data: instancias, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('*')
      .eq('obligacion_id', obligacion.id);
    throwIfError(error);
    if (!instancias || instancias.length !== 1 || instancias[0].estado !== 'pendiente') return;

    const periodo =
      obligacion.recurrencia === 'diaria' ? obligacion.fechaInicio : firstDayOfMonth(obligacion.fechaInicio);

    const { error: updateError } = await this.supabase.client
      .from('obligacion_instancias')
      .update({ periodo, fecha_vencimiento: obligacion.fechaInicio, monto: obligacion.monto })
      .eq('id', instancias[0].id);
    throwIfError(updateError);
  }

  // Actualizacion rapida del saldo pendiente de un credito (uso mensual,
  // sin pasar por el formulario completo de editar obligacion).
  async actualizarSaldo(id: string, saldoPendiente: number): Promise<Obligacion> {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update({ saldo_pendiente: saldoPendiente, saldo_actualizado_en: hoyIso() })
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

  // Genera las instancias que ya deberian existir (obligaciones mensual/
  // diaria cuya ultima instancia quedo en el pasado). Se puede llamar a
  // mano (endpoint) o via cron; "atrapa" varios periodos de una vez si
  // hace falta (ej. si el proceso estuvo caido unos dias).
  async generarPendientes(): Promise<GenerarInstanciasResultado> {
    const { data: obligacionRows, error } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('activa', true)
      .in('recurrencia', ['mensual', 'diaria']);
    throwIfError(error);

    const obligaciones = obligacionRows ?? [];
    const hoy = hoyIso();
    let instanciasCreadas = 0;

    for (const obligacionRow of obligaciones) {
      const obligacion = toObligacion(obligacionRow);
      instanciasCreadas += await this.generarPendientesDeObligacion(obligacion, hoy);
    }

    this.logger.log(
      `generarPendientes: ${obligaciones.length} obligaciones revisadas, ${instanciasCreadas} instancias creadas`,
    );

    return { obligacionesRevisadas: obligaciones.length, instanciasCreadas };
  }

  private async generarPendientesDeObligacion(obligacion: Obligacion, hoy: string): Promise<number> {
    const { data: ultimaInstancia, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('*')
      .eq('obligacion_id', obligacion.id)
      .order('fecha_vencimiento', { ascending: false })
      .limit(1)
      .maybeSingle();
    throwIfError(error);
    if (!ultimaInstancia) return 0; // no deberia pasar: create() siempre genera la primera

    let ultimaFecha: string = ultimaInstancia.fecha_vencimiento;
    let cuotasGeneradas: number | null = null;
    let creadas = 0;

    for (let i = 0; i < TOPE_ITERACIONES; i++) {
      const siguienteFecha =
        obligacion.recurrencia === 'diaria' ? addDays(ultimaFecha, 1) : addMonths(ultimaFecha, 1);

      if (siguienteFecha > hoy) break;

      if (obligacion.numeroCuotas != null) {
        if (cuotasGeneradas === null) {
          cuotasGeneradas = await this.contarInstancias(obligacion.id);
        }
        if (cuotasGeneradas >= obligacion.numeroCuotas) {
          await this.supabase.client
            .from('obligaciones')
            .update({ activa: false })
            .eq('id', obligacion.id);
          break;
        }
      }

      const periodo =
        obligacion.recurrencia === 'diaria' ? siguienteFecha : firstDayOfMonth(siguienteFecha);

      const { error: insertError } = await this.supabase.client.from('obligacion_instancias').insert({
        obligacion_id: obligacion.id,
        periodo,
        fecha_vencimiento: siguienteFecha,
        monto: obligacion.monto,
      });

      if (insertError && (insertError as { code?: string }).code !== UNIQUE_VIOLATION) {
        throwIfError(insertError);
      }
      if (!insertError) {
        creadas++;
        if (cuotasGeneradas !== null) cuotasGeneradas++;
      }

      ultimaFecha = siguienteFecha;
    }

    return creadas;
  }

  private async contarInstancias(obligacionId: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('*', { count: 'exact', head: true })
      .eq('obligacion_id', obligacionId);
    throwIfError(error);
    return count ?? 0;
  }

  // Un credito es cualquier obligacion con banco asignado. No hace falta
  // un flag aparte: si tiene banco, es un credito.
  async listCreditos(hogarId: string): Promise<CreditoResumen[]> {
    const { data: obligacionRows, error } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('hogar_id', hogarId)
      .not('banco', 'is', null);
    throwIfError(error);

    const obligaciones = (obligacionRows ?? []).map(toObligacion);
    if (!obligaciones.length) return [];

    const obligacionIds = obligaciones.map((o) => o.id);
    const [{ data: categoriaRows, error: categoriaError }, { data: instanciaRows, error: instanciaError }] =
      await Promise.all([
        this.supabase.client.from('categorias').select('*').or(`hogar_id.is.null,hogar_id.eq.${hogarId}`),
        this.supabase.client
          .from('obligacion_instancias')
          .select('*')
          .in('obligacion_id', obligacionIds)
          .order('fecha_vencimiento'),
      ]);
    throwIfError(categoriaError);
    throwIfError(instanciaError);

    const categoriasById = new Map((categoriaRows ?? []).map((c) => [c.id, toCategoria(c)]));

    return obligaciones.map((obligacion) => {
      const instancias = (instanciaRows ?? []).filter((i) => i.obligacion_id === obligacion.id);
      const cuotasPagadas = instancias.filter((i) => i.estado === 'pagado').length;
      const proxima = instancias.find((i) => i.estado !== 'pagado');

      return {
        obligacionId: obligacion.id,
        descripcion: obligacion.descripcion,
        categoriaNombre: categoriasById.get(obligacion.categoriaId)?.nombre ?? '—',
        banco: obligacion.banco,
        tasaInteres: obligacion.tasaInteres,
        montoCuota: obligacion.monto,
        numeroCuotas: obligacion.numeroCuotas,
        cuotasPagadas,
        cuotasRestantes: obligacion.numeroCuotas != null ? obligacion.numeroCuotas - cuotasPagadas : null,
        proximaFechaVencimiento: proxima ? proxima.fecha_vencimiento : null,
        activa: obligacion.activa,
        saldoPendiente: obligacion.saldoPendiente,
        saldoActualizadoEn: obligacion.saldoActualizadoEn,
      };
    });
  }
}
