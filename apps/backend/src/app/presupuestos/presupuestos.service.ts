import { Injectable } from '@nestjs/common';
import type {
  CreatePresupuestoDto,
  Presupuesto,
  PresupuestoResumenItem,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCategoria, toPresupuesto } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';
import { periodEnd, periodStart } from '../common/period';

@Injectable()
export class PresupuestosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogarYPeriodo(hogarId: string, periodo: string): Promise<Presupuesto[]> {
    const { data, error } = await this.supabase.client
      .from('presupuestos')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('periodo', periodStart(periodo));

    throwIfError(error);
    return (data ?? []).map(toPresupuesto);
  }

  async upsert(dto: CreatePresupuestoDto): Promise<Presupuesto> {
    const { data, error } = await this.supabase.client
      .from('presupuestos')
      .upsert(
        {
          hogar_id: dto.hogarId,
          categoria_id: dto.categoriaId,
          periodo: periodStart(dto.periodo),
          monto_presupuestado: dto.montoPresupuestado,
        },
        { onConflict: 'hogar_id,categoria_id,periodo' },
      )
      .select()
      .single();

    throwIfError(error);
    return toPresupuesto(data);
  }

  async resumen(hogarId: string, periodo: string): Promise<PresupuestoResumenItem[]> {
    const inicio = periodStart(periodo);
    const fin = periodEnd(periodo);

    const [presupuestoRows, gastoRows, categoriaRows] = await Promise.all([
      this.findByHogarYPeriodo(hogarId, periodo),
      this.fetchGastosDelPeriodo(hogarId, inicio, fin),
      this.fetchCategorias(hogarId),
    ]);

    const categoriasById = new Map(categoriaRows.map((c) => [c.id, toCategoria(c)]));

    const gastadoPorCategoria = new Map<string, number>();
    for (const gasto of gastoRows) {
      const acumulado = gastadoPorCategoria.get(gasto.categoria_id) ?? 0;
      gastadoPorCategoria.set(gasto.categoria_id, acumulado + Number(gasto.monto_total));
    }

    const categoriaIds = new Set<string>([
      ...presupuestoRows.map((p) => p.categoriaId),
      ...gastadoPorCategoria.keys(),
    ]);

    return Array.from(categoriaIds).map((categoriaId) => {
      const presupuesto = presupuestoRows.find((p) => p.categoriaId === categoriaId);
      const presupuestado = presupuesto?.montoPresupuestado ?? 0;
      const gastado = gastadoPorCategoria.get(categoriaId) ?? 0;

      return {
        categoriaId,
        categoriaNombre: categoriasById.get(categoriaId)?.nombre ?? 'Sin categoria',
        presupuestado,
        gastado,
        diferencia: presupuestado - gastado,
      };
    });
  }

  private async fetchGastosDelPeriodo(hogarId: string, inicio: string, fin: string) {
    const { data, error } = await this.supabase.client
      .from('gastos')
      .select('categoria_id, monto_total')
      .eq('hogar_id', hogarId)
      .gte('fecha', inicio)
      .lte('fecha', fin);
    throwIfError(error);
    return data ?? [];
  }

  private async fetchCategorias(hogarId: string) {
    const { data, error } = await this.supabase.client
      .from('categorias')
      .select('*')
      .or(`hogar_id.is.null,hogar_id.eq.${hogarId}`);
    throwIfError(error);
    return data ?? [];
  }
}
