import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateProductoDto,
  HistoricoPrecioItem,
  Producto,
  UpdateProductoDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toLugar, toProducto } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class ProductosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Producto[]> {
    const { data, error } = await this.supabase.client
      .from('productos')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('nombre');

    throwIfError(error);
    return (data ?? []).map(toProducto);
  }

  async create(dto: CreateProductoDto): Promise<Producto> {
    const { data, error } = await this.supabase.client
      .from('productos')
      .insert({
        hogar_id: dto.hogarId,
        categoria_id: dto.categoriaId ?? null,
        nombre: dto.nombre,
      })
      .select()
      .single();

    throwIfError(error);
    return toProducto(data);
  }

  async findOrCreateByNombre(hogarId: string, nombre: string): Promise<Producto> {
    const { data: existente, error: findError } = await this.supabase.client
      .from('productos')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('nombre', nombre)
      .maybeSingle();
    throwIfError(findError);
    if (existente) return toProducto(existente);

    return this.create({ hogarId, nombre });
  }

  async update(id: string, dto: UpdateProductoDto): Promise<Producto> {
    const patch: Record<string, unknown> = {};
    if (dto.nombre !== undefined) patch['nombre'] = dto.nombre;
    if (dto.categoriaId !== undefined) patch['categoria_id'] = dto.categoriaId;

    const { data, error } = await this.supabase.client
      .from('productos')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Producto no encontrado');
    return toProducto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('productos').delete().eq('id', id);
    throwIfError(error);
  }

  // Punto 4: comparar precios de un producto (ej. "carne") a traves del
  // tiempo y por lugar de compra.
  async historicoPrecios(productoId: string): Promise<HistoricoPrecioItem[]> {
    const { data: itemRows, error } = await this.supabase.client
      .from('gasto_items')
      .select('*')
      .eq('producto_id', productoId);
    throwIfError(error);
    if (!itemRows || !itemRows.length) return [];

    const gastoIds = [...new Set(itemRows.map((i: any) => i.gasto_id))];
    const { data: gastoRows, error: gastoError } = await this.supabase.client
      .from('gastos')
      .select('id, fecha, lugar_id')
      .in('id', gastoIds);
    throwIfError(gastoError);

    const gastosById = new Map((gastoRows ?? []).map((g: any) => [g.id, g]));

    const lugarIds = [
      ...new Set((gastoRows ?? []).map((g: any) => g.lugar_id).filter(Boolean)),
    ];
    const lugares = lugarIds.length ? await this.fetchLugares(lugarIds) : [];
    const lugaresById = new Map(lugares.map((l) => [l.id, l]));

    return itemRows
      .map((item: any) => {
        const gasto = gastosById.get(item.gasto_id);
        const lugar = gasto?.lugar_id ? lugaresById.get(gasto.lugar_id) : null;
        return {
          fecha: gasto?.fecha ?? null,
          lugarId: gasto?.lugar_id ?? null,
          lugarNombre: lugar?.nombre ?? null,
          cantidad: item.cantidad,
          precioUnitario: item.precio_unitario,
        } as HistoricoPrecioItem;
      })
      .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''));
  }

  private async fetchLugares(ids: string[]) {
    const { data, error } = await this.supabase.client
      .from('lugares')
      .select('*')
      .in('id', ids);
    throwIfError(error);
    return (data ?? []).map(toLugar);
  }
}
