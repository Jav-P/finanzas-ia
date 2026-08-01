import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateGastoDto, GastoConItems } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toGasto, toGastoItem } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class GastosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(
    hogarId: string,
    desde?: string,
    hasta?: string,
  ): Promise<GastoConItems[]> {
    let query = this.supabase.client
      .from('gastos')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('fecha', { ascending: false });

    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);

    const { data: gastoRows, error } = await query;
    throwIfError(error);
    const gastos = gastoRows ?? [];
    if (!gastos.length) return [];

    const itemsByGasto = await this.fetchItemsAgrupados(gastos.map((g: any) => g.id));

    return gastos.map((row: any) => ({
      ...toGasto(row),
      items: itemsByGasto.get(row.id) ?? [],
    }));
  }

  async findOne(id: string): Promise<GastoConItems> {
    const { data: gastoRow, error } = await this.supabase.client
      .from('gastos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError(error);
    if (!gastoRow) throw new NotFoundException('Gasto no encontrado');

    const itemsByGasto = await this.fetchItemsAgrupados([id]);
    return { ...toGasto(gastoRow), items: itemsByGasto.get(id) ?? [] };
  }

  async create(dto: CreateGastoDto): Promise<GastoConItems> {
    const { data: gastoRow, error } = await this.supabase.client
      .from('gastos')
      .insert({
        hogar_id: dto.hogarId,
        usuario_id: dto.usuarioId,
        categoria_id: dto.categoriaId,
        lugar_id: dto.lugarId ?? null,
        medio_pago_id: dto.medioPagoId ?? null,
        descripcion: dto.descripcion,
        monto_total: dto.montoTotal,
        fecha: dto.fecha,
      })
      .select()
      .single();

    throwIfError(error);

    const items = dto.items ?? [];
    if (!items.length) {
      return { ...toGasto(gastoRow), items: [] };
    }

    const { data: itemRows, error: itemsError } = await this.supabase.client
      .from('gasto_items')
      .insert(
        items.map((item) => ({
          gasto_id: gastoRow.id,
          producto_id: item.productoId,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          calificacion: item.calificacion ?? null,
        })),
      )
      .select();

    throwIfError(itemsError);

    return { ...toGasto(gastoRow), items: (itemRows ?? []).map(toGastoItem) };
  }

  private async fetchItemsAgrupados(gastoIds: string[]) {
    const { data, error } = await this.supabase.client
      .from('gasto_items')
      .select('*')
      .in('gasto_id', gastoIds);
    throwIfError(error);

    const map = new Map<string, ReturnType<typeof toGastoItem>[]>();
    for (const row of data ?? []) {
      const item = toGastoItem(row);
      const lista = map.get(item.gastoId) ?? [];
      lista.push(item);
      map.set(item.gastoId, lista);
    }
    return map;
  }
}
