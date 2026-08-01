import { Injectable } from '@nestjs/common';
import type { Balance, BalancePersona } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { toObligacion } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';
import { periodEnd, periodStart } from '../common/period';

@Injectable()
export class BalanceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usuarios: UsuariosService,
  ) {}

  async calcular(hogarId: string, periodo: string): Promise<Balance> {
    const inicio = periodStart(periodo);
    const fin = periodEnd(periodo);

    const usuarios = await this.usuarios.findByHogar(hogarId);

    const [ingresoRows, obligacionRows, gastoRows] = await Promise.all([
      this.fetchIngresos(hogarId),
      this.fetchObligaciones(hogarId),
      this.fetchGastos(hogarId, inicio, fin),
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

    return {
      periodo,
      ingresos: totales.ingresos,
      obligaciones: totales.obligaciones,
      gastos: totales.gastos,
      saldo: totales.ingresos - totales.obligaciones - totales.gastos,
      porUsuario,
    };
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
