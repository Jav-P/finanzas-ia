import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ConfirmarIngresoDto,
  IngresoPendiente,
  Movimiento,
  OmitirIngresoDto,
  TipoMovimiento,
  TransferenciaDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toMovimiento } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';
import { addMeses, hoyColombia, periodEnd } from '../common/period';

interface NuevoMovimiento {
  hogarId: string;
  fecha: string;
  tipo: TipoMovimiento;
  origenId?: string | null;
  destinoId?: string | null;
  monto: number;
  montoDestino?: number | null;
  descripcion?: string;
  gastoId?: string | null;
  pagoId?: string | null;
  ingresoId?: string | null;
}

@Injectable()
export class MovimientosService {
  constructor(private readonly supabase: SupabaseService) {}

  async listar(hogarId: string, cuentaId?: string, limite = 50): Promise<Movimiento[]> {
    let query = this.supabase.client
      .from('movimientos')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite);
    if (cuentaId) query = query.or(`cuenta_origen_id.eq.${cuentaId},cuenta_destino_id.eq.${cuentaId}`);

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toMovimiento);
  }

  async transferir(hogarId: string, dto: TransferenciaDto): Promise<Movimiento> {
    if (dto.cuentaOrigenId === dto.cuentaDestinoId) {
      throw new BadRequestException('La cuenta de origen y la de destino deben ser distintas');
    }
    return this.registrar({
      hogarId,
      fecha: dto.fecha,
      tipo: 'transferencia',
      origenId: dto.cuentaOrigenId,
      destinoId: dto.cuentaDestinoId,
      monto: dto.monto,
      montoDestino: dto.montoDestino ?? null,
      descripcion: dto.descripcion ?? '',
    });
  }

  // Los movimientos que vienen de un gasto o de un pago se quitan desde
  // ahi (al borrar el gasto o el comprobante), para que no queden
  // desalineados con su origen.
  async eliminar(hogarId: string, id: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('movimientos')
      .select('tipo')
      .eq('id', id)
      .eq('hogar_id', hogarId)
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new NotFoundException('Movimiento no encontrado');
    if (data.tipo === 'gasto' || data.tipo === 'pago_obligacion') {
      throw new BadRequestException(
        data.tipo === 'gasto'
          ? 'Este movimiento viene de un gasto: elimínalo o cámbiale la cuenta desde el gasto.'
          : 'Este movimiento viene del pago de una obligación: quita el comprobante desde la obligación.',
      );
    }
    await this.eliminarPorId(id);
  }

  // Deja el movimiento de un gasto alineado con el gasto: borra el que
  // hubiera y, si el gasto tiene cuenta, registra uno nuevo.
  async sincronizarGasto(gasto: {
    id: string;
    hogar_id: string;
    cuenta_id: string | null;
    monto_total: number;
    fecha: string;
    descripcion: string;
  }): Promise<void> {
    await this.eliminarDe('gasto_id', gasto.id);
    if (!gasto.cuenta_id) return;
    await this.registrar({
      hogarId: gasto.hogar_id,
      fecha: gasto.fecha,
      tipo: 'gasto',
      origenId: gasto.cuenta_id,
      monto: Number(gasto.monto_total),
      descripcion: gasto.descripcion,
      gastoId: gasto.id,
    });
  }

  async registrarPago(pago: { id: string; cuentaId: string; hogarId: string; fecha: string; monto: number; descripcion: string }): Promise<void> {
    await this.registrar({
      hogarId: pago.hogarId,
      fecha: pago.fecha,
      tipo: 'pago_obligacion',
      origenId: pago.cuentaId,
      monto: pago.monto,
      descripcion: pago.descripcion,
      pagoId: pago.id,
    });
  }

  async eliminarDe(columna: 'gasto_id' | 'pago_id', id: string): Promise<void> {
    const { data, error } = await this.supabase.client.from('movimientos').select('id').eq(columna, id);
    throwIfError(error);
    for (const row of data ?? []) await this.eliminarPorId(row.id);
  }

  // Ingresos recurrentes cuyo dia de pago ya llego este mes (o el
  // anterior, porque el sueldo de fin de mes se suele confirmar dias
  // despues) y que todavia no se confirmaron ni descartaron. Solo desde
  // el mes en que el hogar empezo a usar cuentas.
  async ingresosPendientes(hogarId: string): Promise<IngresoPendiente[]> {
    const { data: primera, error: cuentasError } = await this.supabase.client
      .from('cuentas')
      .select('created_at')
      .eq('hogar_id', hogarId)
      .order('created_at')
      .limit(1);
    throwIfError(cuentasError);
    if (!primera?.length) return [];

    const inicio = new Date(primera[0].created_at).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
    const hoy = hoyColombia();
    const mesActual = hoy.slice(0, 7);
    const periodos = [addMeses(mesActual, -1), mesActual].filter((p) => p >= inicio);

    const [{ data: ingresos, error: ingresosError }, { data: recepciones, error: recepcionesError }] = await Promise.all([
      this.supabase.client.from('ingresos').select('*').eq('hogar_id', hogarId).eq('activo', true),
      this.supabase.client
        .from('ingreso_recepciones')
        .select('ingreso_id, periodo')
        .eq('hogar_id', hogarId)
        .in('periodo', periodos.map((p) => `${p}-01`)),
    ]);
    throwIfError(ingresosError);
    throwIfError(recepcionesError);

    const yaResueltos = new Set((recepciones ?? []).map((r: any) => `${r.ingreso_id}|${String(r.periodo).slice(0, 7)}`));
    const pendientes: IngresoPendiente[] = [];

    for (const periodo of periodos) {
      for (const ingreso of ingresos ?? []) {
        const fechaEsperada = this.fechaEsperada(ingreso, periodo);
        if (!fechaEsperada || fechaEsperada > hoy) continue;
        if (yaResueltos.has(`${ingreso.id}|${periodo}`)) continue;
        pendientes.push({
          ingresoId: ingreso.id,
          usuarioId: ingreso.usuario_id,
          descripcion: ingreso.descripcion,
          periodo,
          fechaEsperada,
          monto: Number(ingreso.monto),
        });
      }
    }
    return pendientes;
  }

  async confirmarIngreso(hogarId: string, dto: ConfirmarIngresoDto): Promise<Movimiento> {
    const ingreso = await this.buscarIngreso(hogarId, dto.ingresoId);
    await this.asegurarNoResuelto(dto.ingresoId, dto.periodo);

    const movimiento = await this.registrar({
      hogarId,
      fecha: dto.fecha,
      tipo: 'ingreso',
      destinoId: dto.cuentaId,
      monto: dto.monto,
      descripcion: ingreso.descripcion,
      ingresoId: dto.ingresoId,
    });

    const { error } = await this.supabase.client.from('ingreso_recepciones').insert({
      hogar_id: hogarId,
      ingreso_id: dto.ingresoId,
      periodo: `${dto.periodo}-01`,
      movimiento_id: movimiento.id,
    });
    if (error) {
      await this.eliminarPorId(movimiento.id);
      throwIfError(error);
    }
    return movimiento;
  }

  async omitirIngreso(hogarId: string, dto: OmitirIngresoDto): Promise<void> {
    await this.buscarIngreso(hogarId, dto.ingresoId);
    await this.asegurarNoResuelto(dto.ingresoId, dto.periodo);
    const { error } = await this.supabase.client.from('ingreso_recepciones').insert({
      hogar_id: hogarId,
      ingreso_id: dto.ingresoId,
      periodo: `${dto.periodo}-01`,
      movimiento_id: null,
    });
    throwIfError(error);
  }

  private fechaEsperada(ingreso: any, periodo: string): string | null {
    if (ingreso.periodicidad === 'unica') {
      return String(ingreso.fecha_inicio).startsWith(periodo) ? ingreso.fecha_inicio : null;
    }
    const finDeMes = periodEnd(periodo);
    const dia = Math.min(ingreso.dia_pago ?? 1, Number(finDeMes.slice(8)));
    const fecha = `${periodo}-${String(dia).padStart(2, '0')}`;
    return ingreso.fecha_inicio <= fecha ? fecha : null;
  }

  private async buscarIngreso(hogarId: string, ingresoId: string): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('ingresos')
      .select('*')
      .eq('id', ingresoId)
      .eq('hogar_id', hogarId)
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new NotFoundException('Ingreso no encontrado');
    return data;
  }

  private async asegurarNoResuelto(ingresoId: string, periodo: string): Promise<void> {
    const { count, error } = await this.supabase.client
      .from('ingreso_recepciones')
      .select('id', { count: 'exact', head: true })
      .eq('ingreso_id', ingresoId)
      .eq('periodo', `${periodo}-01`);
    throwIfError(error);
    if (count) throw new BadRequestException('Este ingreso ya se confirmó para ese mes');
  }

  private async registrar(m: NuevoMovimiento): Promise<Movimiento> {
    if (!(m.monto > 0)) throw new BadRequestException('El monto debe ser mayor a cero');
    await this.validarCuentas(m.hogarId, [m.origenId, m.destinoId]);

    const { data, error } = await this.supabase.client.rpc('registrar_movimiento', {
      p_hogar: m.hogarId,
      p_fecha: m.fecha,
      p_tipo: m.tipo,
      p_origen: m.origenId ?? null,
      p_destino: m.destinoId ?? null,
      p_monto: m.monto,
      p_monto_destino: m.montoDestino ?? null,
      p_descripcion: m.descripcion ?? '',
      p_gasto: m.gastoId ?? null,
      p_pago: m.pagoId ?? null,
      p_ingreso: m.ingresoId ?? null,
    });
    throwIfError(error);
    return toMovimiento(data);
  }

  private async eliminarPorId(id: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('eliminar_movimiento', { p_id: id });
    throwIfError(error);
  }

  private async validarCuentas(hogarId: string, ids: (string | null | undefined)[]): Promise<void> {
    const conValor = ids.filter((id): id is string => !!id);
    if (!conValor.length) throw new BadRequestException('Falta la cuenta del movimiento');

    const { data, error } = await this.supabase.client
      .from('cuentas')
      .select('id')
      .eq('hogar_id', hogarId)
      .in('id', conValor);
    throwIfError(error);
    if ((data ?? []).length !== new Set(conValor).size) {
      throw new BadRequestException('Alguna de las cuentas no existe en tu hogar');
    }
  }
}
