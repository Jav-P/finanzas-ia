import { Injectable } from '@nestjs/common';
import type { CreateMedioPagoDto, MedioPago } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toMedioPago } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class MediosPagoService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<MedioPago[]> {
    const { data, error } = await this.supabase.client
      .from('medios_pago')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('nombre');

    throwIfError(error);
    return (data ?? []).map(toMedioPago);
  }

  async create(dto: CreateMedioPagoDto): Promise<MedioPago> {
    const { data, error } = await this.supabase.client
      .from('medios_pago')
      .insert({ hogar_id: dto.hogarId, nombre: dto.nombre, tipo: dto.tipo })
      .select()
      .single();

    throwIfError(error);
    return toMedioPago(data);
  }
}
