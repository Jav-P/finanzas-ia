import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateGastoDto, GastoConItems, UpdateGastoDto } from '@finanzas-ia/shared-types';
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

  async update(id: string, dto: UpdateGastoDto): Promise<GastoConItems> {
    const patch: Record<string, unknown> = {};
    if (dto.usuarioId !== undefined) patch['usuario_id'] = dto.usuarioId;
    if (dto.categoriaId !== undefined) patch['categoria_id'] = dto.categoriaId;
    if (dto.lugarId !== undefined) patch['lugar_id'] = dto.lugarId;
    if (dto.medioPagoId !== undefined) patch['medio_pago_id'] = dto.medioPagoId;
    if (dto.descripcion !== undefined) patch['descripcion'] = dto.descripcion;
    if (dto.montoTotal !== undefined) patch['monto_total'] = dto.montoTotal;
    if (dto.fecha !== undefined) patch['fecha'] = dto.fecha;

    const { data: gastoRow, error } = await this.supabase.client
      .from('gastos')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!gastoRow) throw new NotFoundException('Gasto no encontrado');

    // Si vienen items, reemplazan por completo los existentes.
    if (dto.items !== undefined) {
      const { error: deleteError } = await this.supabase.client
        .from('gasto_items')
        .delete()
        .eq('gasto_id', id);
      throwIfError(deleteError);

      if (dto.items.length) {
        const { error: insertError } = await this.supabase.client.from('gasto_items').insert(
          dto.items.map((item) => ({
            gasto_id: id,
            producto_id: item.productoId,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            calificacion: item.calificacion ?? null,
          })),
        );
        throwIfError(insertError);
      }
    }

    const itemsByGasto = await this.fetchItemsAgrupados([id]);
    return { ...toGasto(gastoRow), items: itemsByGasto.get(id) ?? [] };
  }

  async remove(id: string): Promise<void> {
    const { error: itemsError } = await this.supabase.client
      .from('gasto_items')
      .delete()
      .eq('gasto_id', id);
    throwIfError(itemsError);

    const { error } = await this.supabase.client.from('gastos').delete().eq('id', id);
    throwIfError(error);
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
