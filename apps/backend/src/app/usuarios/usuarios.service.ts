import { Injectable } from '@nestjs/common';
import type { Usuario } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toUsuario } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class UsuariosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Usuario[]> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('nombre');

    throwIfError(error);
    return (data ?? []).map(toUsuario);
  }
}
