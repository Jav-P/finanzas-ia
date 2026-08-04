import { Injectable, NotFoundException } from '@nestjs/common';
import type { Hogar } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { throwIfError } from '../common/throw-if-error';

function toHogar(row: any): Hogar {
  return { id: row.id, nombre: row.nombre, createdAt: row.created_at };
}

@Injectable()
export class HogaresService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(nombre: string): Promise<Hogar> {
    const { data, error } = await this.supabase.client
      .from('hogares')
      .insert({ nombre })
      .select()
      .single();
    throwIfError(error);
    return toHogar(data);
  }

  async findOne(id: string): Promise<Hogar> {
    const { data, error } = await this.supabase.client
      .from('hogares')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new NotFoundException('Hogar no encontrado');
    return toHogar(data);
  }
}
