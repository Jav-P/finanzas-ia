import { Injectable } from '@nestjs/common';
import type { Categoria, CreateCategoriaDto } from '@finanzas-ia/shared-types';
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
}
