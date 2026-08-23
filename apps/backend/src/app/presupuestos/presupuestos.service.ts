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

  async findTodosDelHogar(hogarId: string): Promise<Presupuesto[]> {
    const { data, error } = await this.supabase.client
      .from('presupuestos')
      .select('*')
      .eq('hogar_id', hogarId);

    throwIfError(error);
    return (data ?? []).map(toPresupuesto);
  }

  // Si dto.esFijo, actualiza el monto del fijo que ya exista para esa
  // categoria (conserva su periodo original) en vez de crear uno
  // nuevo; asi solo hay un fijo activo por categoria a la vez. Si no
  // hay uno todavia, o si no es fijo, se crea/actualiza el presupuesto
  // puntual de ese mes exacto (comportamiento de siempre).
  async upsert(hogarId: string, dto: CreatePresupuestoDto): Promise<Presupuesto> {
    const esFijo = dto.esFijo ?? false;

    if (esFijo) {
      const fijoExistente = await this.buscarFijo(hogarId, dto.categoriaId);
      if (fijoExistente) {
        const { data, error } = await this.supabase.client
          .from('presupuestos')
          .update({ monto_presupuestado: dto.montoPresupuestado })
          .eq('id', fijoExistente.id)
          .select()
          .single();
        throwIfError(error);
        return toPresupuesto(data);
      }
    }

    const { data, error } = await this.supabase.client
      .from('presupuestos')
      .upsert(
        {
          hogar_id: hogarId,
          categoria_id: dto.categoriaId,
          periodo: periodStart(dto.periodo),
          monto_presupuestado: dto.montoPresupuestado,
          es_fijo: esFijo,
        },
        { onConflict: 'hogar_id,categoria_id,periodo' },
      )
      .select()
      .single();

    throwIfError(error);
    return toPresupuesto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('presupuestos').delete().eq('id', id);
    throwIfError(error);
  }

  async resumen(hogarId: string, periodo: string): Promise<PresupuestoResumenItem[]> {
    const inicio = periodStart(periodo);
    const fin = periodEnd(periodo);

    const [presupuestos, gastoRows, categoriaRows] = await Promise.all([
      this.findTodosDelHogar(hogarId),
      this.fetchGastosDelPeriodo(hogarId, inicio, fin),
      this.fetchCategorias(hogarId),
    ]);

    const categoriasById = new Map(categoriaRows.map((c) => [c.id, toCategoria(c)]));

    const gastadoPorCategoria = new Map<string, number>();
    for (const gasto of gastoRows) {
      const acumulado = gastadoPorCategoria.get(gasto.categoria_id) ?? 0;
      gastadoPorCategoria.set(gasto.categoria_id, acumulado + Number(gasto.monto_total));
    }

    // Por categoria: un presupuesto puntual para este mes exacto gana
    // sobre uno fijo (permite "este mes en particular quiero mas para
    // mercado" sin tocar el fijo). Si no hay uno puntual, se usa el
    // fijo de esa categoria (aplica desde que se creo en adelante).
    const presupuestoPorCategoria = new Map<string, Presupuesto>();
    for (const p of presupuestos) {
      if (p.periodo === inicio) presupuestoPorCategoria.set(p.categoriaId, p);
    }
    for (const p of presupuestos) {
      if (!p.esFijo || p.periodo > inicio) continue;
      if (presupuestoPorCategoria.get(p.categoriaId)?.periodo === inicio) continue;
      presupuestoPorCategoria.set(p.categoriaId, p);
    }

    const categoriaIds = new Set<string>([
      ...presupuestoPorCategoria.keys(),
      ...gastadoPorCategoria.keys(),
    ]);

    return Array.from(categoriaIds).map((categoriaId) => {
      const presupuesto = presupuestoPorCategoria.get(categoriaId);
      const presupuestado = presupuesto?.montoPresupuestado ?? 0;
      const gastado = gastadoPorCategoria.get(categoriaId) ?? 0;

      return {
        categoriaId,
        categoriaNombre: categoriasById.get(categoriaId)?.nombre ?? 'Sin categoria',
        presupuestado,
        gastado,
        diferencia: presupuestado - gastado,
        esFijo: presupuesto?.esFijo ?? false,
        presupuestoId: presupuesto?.id ?? null,
      };
    });
  }

  private async buscarFijo(hogarId: string, categoriaId: string): Promise<Presupuesto | null> {
    const { data, error } = await this.supabase.client
      .from('presupuestos')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('categoria_id', categoriaId)
      .eq('es_fijo', true)
      .maybeSingle();
    throwIfError(error);
    return data ? toPresupuesto(data) : null;
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
