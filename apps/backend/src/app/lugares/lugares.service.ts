import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLugarDto, Lugar, UpdateLugarDto } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toLugar } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class LugaresService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Lugar[]> {
    const { data, error } = await this.supabase.client
      .from('lugares')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('nombre');

    throwIfError(error);
    return (data ?? []).map(toLugar);
  }

  async create(hogarId: string, dto: CreateLugarDto): Promise<Lugar> {
    const { data, error } = await this.supabase.client
      .from('lugares')
      .insert({ hogar_id: hogarId, nombre: dto.nombre })
      .select()
      .single();

    throwIfError(error);
    return toLugar(data);
  }

  async findOrCreateByNombre(hogarId: string, nombre: string): Promise<Lugar> {
    const { data: existente, error: findError } = await this.supabase.client
      .from('lugares')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('nombre', nombre)
      .maybeSingle();
    throwIfError(findError);
    if (existente) return toLugar(existente);

    return this.create(hogarId, { nombre });
  }

  async update(id: string, dto: UpdateLugarDto): Promise<Lugar> {
    const patch: Record<string, unknown> = {};
    if (dto.nombre !== undefined) patch['nombre'] = dto.nombre;

    const { data, error } = await this.supabase.client
      .from('lugares')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Lugar no encontrado');
    return toLugar(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('lugares').delete().eq('id', id);
    throwIfError(error);
  }
}
