import { Injectable } from '@nestjs/common';
import type { CreateLugarDto, Lugar } from '@finanzas-ia/shared-types';
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

  async create(dto: CreateLugarDto): Promise<Lugar> {
    const { data, error } = await this.supabase.client
      .from('lugares')
      .insert({ hogar_id: dto.hogarId, nombre: dto.nombre })
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

    return this.create({ hogarId, nombre });
  }
}
