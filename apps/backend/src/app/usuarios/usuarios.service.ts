import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findOne(id: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    throwIfError(error);
    return data ? toUsuario(data) : null;
  }

  // id = auth.users.id (Supabase Auth). Se llama justo despues del
  // signUp, nunca antes: la fila en auth.users tiene que existir ya.
  async create(id: string, email: string, nombre: string, hogarId: string | null): Promise<Usuario> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .insert({ id, hogar_id: hogarId, nombre, email })
      .select()
      .single();

    throwIfError(error);
    return toUsuario(data);
  }

  async setHogar(id: string, hogarId: string): Promise<Usuario> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .update({ hogar_id: hogarId })
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Usuario no encontrado');
    return toUsuario(data);
  }
}
