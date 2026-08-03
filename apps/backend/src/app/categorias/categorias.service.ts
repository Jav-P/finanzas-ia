import { Injectable, NotFoundException } from '@nestjs/common';
import type { Categoria, CreateCategoriaDto, UpdateCategoriaDto } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCategoria } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class CategoriasService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Categoria[]> {
    const { data, error } = await this.supabase.client
      .from('categorias')
      .select('*')
      .or(`hogar_id.is.null,hogar_id.eq.${hogarId}`)
      .order('nombre');

    throwIfError(error);
    return (data ?? []).map(toCategoria);
  }

  async create(dto: CreateCategoriaDto): Promise<Categoria> {
    const { data, error } = await this.supabase.client
      .from('categorias')
      .insert({
        hogar_id: dto.hogarId,
        nombre: dto.nombre,
        color: dto.color ?? null,
      })
      .select()
      .single();

    throwIfError(error);
    return toCategoria(data);
  }

  async update(id: string, dto: UpdateCategoriaDto): Promise<Categoria> {
    const patch: Record<string, unknown> = {};
    if (dto.nombre !== undefined) patch['nombre'] = dto.nombre;
    if (dto.color !== undefined) patch['color'] = dto.color;

    const { data, error } = await this.supabase.client
      .from('categorias')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Categoria no encontrada');
    return toCategoria(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('categorias').delete().eq('id', id);
    throwIfError(error);
  }
}
