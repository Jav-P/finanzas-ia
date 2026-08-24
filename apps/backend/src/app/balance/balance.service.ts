import { Injectable } from '@nestjs/common';
import type { Balance, BalancePersona } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PresupuestosService } from '../presupuestos/presupuestos.service';
import { toObligacion } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';
import { addMeses, periodEnd, periodStart } from '../common/period';

@Injectable()
export class BalanceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usuarios: UsuariosService,
    private readonly presupuestos: PresupuestosService,
  ) {}

  async calcular(hogarId: string, periodo: string): Promise<Balance> {
    const inicio = periodStart(periodo);
    const fin = periodEnd(periodo);

    // El sueldo se paga a fin de mes y con eso se cubren las obligaciones
    // fijas del mes SIGUIENTE (los vencimientos caen apenas despues del
    // pago). Los presupuestos, en cambio, se pagan con tarjeta de credito
    // DURANTE el mes y esa tarjeta se salda con el sueldo de ese MISMO
    // mes (no el siguiente) -- por eso solo las obligaciones se proyectan
    // contra el periodo siguiente; los presupuestos se quedan en el
    // mismo periodo que los ingresos.
    const periodoSiguiente = addMeses(periodo, 1);

    const usuarios = await this.usuarios.findByHogar(hogarId);

    const [ingresoRows, obligacionRows, gastoRows, resumenPresupuestos] = await Promise.all([
      this.fetchIngresos(hogarId),
      this.fetchObligaciones(hogarId),
      this.fetchGastos(hogarId, inicio, fin),
      this.presupuestos.resumen(hogarId, periodo),
    ]);

    const obligacionIds = obligacionRows.map((o: any) => o.id);
    const instanciaRows = await this.fetchInstanciasDelPeriodo(obligacionIds, inicio);
    const obligacionesById = new Map(obligacionRows.map((o: any) => [o.id, toObligacion(o)]));

    const porUsuario: BalancePersona[] = usuarios.map((usuario) => {
      const ingresos = ingresoRows
        .filter((i: any) => i.usuario_id === usuario.id && this.aplicaEnPeriodo(i, inicio, fin))
        .reduce((sum: number, i: any) => sum + Number(i.monto), 0);

      const obligaciones = instanciaRows.reduce((sum: number, instancia: any) => {
        const obligacion = obligacionesById.get(instancia.obligacion_id);
        if (!obligacion) return sum;
        if (obligacion.usuarioResponsableId === usuario.id) {
          return sum + Number(instancia.monto);
        }
        if (obligacion.usuarioResponsableId === null) {
          return sum + Number(instancia.monto) / usuarios.length;
        }
        return sum;
      }, 0);

      const gastos = gastoRows
        .filter((g: any) => g.usuario_id === usuario.id)
        .reduce((sum: number, g: any) => sum + Number(g.monto_total), 0);

      return {
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        ingresos,
        obligaciones,
        gastos,
        saldo: ingresos - obligaciones - gastos,
      };
    });

    const totales = porUsuario.reduce(
      (acc, p) => ({
        ingresos: acc.ingresos + p.ingresos,
        obligaciones: acc.obligaciones + p.obligaciones,
        gastos: acc.gastos + p.gastos,
      }),
      { ingresos: 0, obligaciones: 0, gastos: 0 },
    );

    // Mientras una categoria presupuestada no tenga gasto real registrado
    // este mes, se simula como si ya se hubiera gastado lo presupuestado
    // (asi el "disponible para creditos" no queda inflado con dinero que
    // en la practica ya esta destinado al mercado, etc.). En cuanto se
    // registre un gasto real, este reemplaza a la simulacion.
    const presupuestado = resumenPresupuestos.reduce(
      (sum, item) => sum + (item.gastado > 0 ? item.gastado : item.presupuestado),
      0,
    );

    // "obligaciones" (arriba) depende de que ya exista una instancia
    // generada para el periodo, lo cual no siempre paso todavia (el cron
    // corre una vez al dia y puede no haber alcanzado a crear la cuota de
    // este mes). Para el plan proyectado no queremos depender de eso: una
    // obligacion mensual activa cuenta su monto completo apenas aplica al
    // periodo, exista o no la instancia. Las unicas siguen viniendo de su
    // instancia real (ya se genera de inmediato al crearlas) y las diarias
    // (solo para pruebas) no se proyectan.
    //
    // Para creditos/obligaciones YA existentes que se registran en la app
    // con "fecha del primer vencimiento" = el proximo pago (comun cuando
    // el dia de pago del mes ya paso), fechaInicio cae un mes despues de
    // lo que "deberia" aunque la obligacion ya se este pagando todos los
    // meses. Por eso se admite hasta 1 mes de adelanto sobre el periodo
    // objetivo (evita subestimar creditos recien cargados).
    const obligacionesProyectadas = this.proyectarObligaciones(obligacionRows, periodoSiguiente);

    const disponibleParaCreditos = totales.ingresos - obligacionesProyectadas - presupuestado;

    return {
      periodo,
      ingresos: totales.ingresos,
      obligaciones: totales.obligaciones,
      gastos: totales.gastos,
      saldo: totales.ingresos - totales.obligaciones - totales.gastos,
      presupuestado,
      periodoObligacionesProyectadas: periodoSiguiente,
      obligacionesProyectadas,
      disponibleParaCreditos,
      porUsuario,
    };
  }

  private proyectarObligaciones(obligacionRows: any[], periodoObjetivo: string): number {
    return obligacionRows.reduce((sum: number, row: any) => {
      const obligacion = toObligacion(row);
      return this.aplicaAlPeriodo(obligacion, periodoObjetivo) ? sum + Number(obligacion.monto) : sum;
    }, 0);
  }

  // Igual que proyectarObligaciones, pero agrupado por categoria en vez
  // de sumado a un solo total. Lo usa Analisis para el ranking de "que
  // es lo mas caro" combinando obligaciones fijas + presupuestos.
  async obligacionesPorCategoria(hogarId: string, periodoObjetivo: string): Promise<Map<string, number>> {
    const obligacionRows = await this.fetchObligaciones(hogarId);
    const mapa = new Map<string, number>();

    for (const row of obligacionRows) {
      const obligacion = toObligacion(row);
      if (!this.aplicaAlPeriodo(obligacion, periodoObjetivo)) continue;
      mapa.set(obligacion.categoriaId, (mapa.get(obligacion.categoriaId) ?? 0) + Number(obligacion.monto));
    }

    return mapa;
  }

  // Una obligacion mensual activa cuenta su monto completo apenas
  // aplica al periodo, exista o no la instancia (ver comentario en
  // calcular()). Se admite hasta 1 mes de adelanto sobre el periodo
  // objetivo para no subestimar creditos recien cargados cuyo "proximo
  // vencimiento" cayo un mes despues por el dia de pago ya pasado.
  private aplicaAlPeriodo(obligacion: ReturnType<typeof toObligacion>, periodoObjetivo: string): boolean {
    if (!obligacion.activa) return false;

    if (obligacion.recurrencia === 'mensual') {
      const limiteMensual = periodEnd(addMeses(periodoObjetivo, 1));
      return obligacion.fechaInicio <= limiteMensual;
    }

    if (obligacion.recurrencia === 'unica') {
      const inicioObjetivo = periodStart(periodoObjetivo);
      const finObjetivo = periodEnd(periodoObjetivo);
      return obligacion.fechaInicio >= inicioObjetivo && obligacion.fechaInicio <= finObjetivo;
    }

    return false;
  }

  private aplicaEnPeriodo(ingresoRow: any, inicio: string, fin: string): boolean {
    if (!ingresoRow.activo) return false;
    if (ingresoRow.periodicidad === 'mensual') {
      return ingresoRow.fecha_inicio <= fin;
    }
    return ingresoRow.fecha_inicio >= inicio && ingresoRow.fecha_inicio <= fin;
  }

  private async fetchIngresos(hogarId: string) {
    const { data, error } = await this.supabase.client
      .from('ingresos')
      .select('*')
      .eq('hogar_id', hogarId);
    throwIfError(error);
    return data ?? [];
  }

  private async fetchObligaciones(hogarId: string) {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('hogar_id', hogarId);
    throwIfError(error);
    return data ?? [];
  }

  private async fetchInstanciasDelPeriodo(obligacionIds: string[], periodo: string) {
    if (!obligacionIds.length) return [];
    const { data, error } = await this.supabase.client
      .from('obligacion_instancias')
      .select('*')
      .in('obligacion_id', obligacionIds)
      .eq('periodo', periodo);
    throwIfError(error);
    return data ?? [];
  }

  private async fetchGastos(hogarId: string, inicio: string, fin: string) {
    const { data, error } = await this.supabase.client
      .from('gastos')
      .select('*')
      .eq('hogar_id', hogarId)
      .gte('fecha', inicio)
      .lte('fecha', fin);
    throwIfError(error);
    return data ?? [];
  }
}
