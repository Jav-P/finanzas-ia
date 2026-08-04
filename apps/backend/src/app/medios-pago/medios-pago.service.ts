import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMedioPagoDto, MedioPago, UpdateMedioPagoDto } from '@finanzas-ia/shared-types';
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

  async create(hogarId: string, dto: CreateMedioPagoDto): Promise<MedioPago> {
    const { data, error } = await this.supabase.client
      .from('medios_pago')
      .insert({ hogar_id: hogarId, nombre: dto.nombre, tipo: dto.tipo })
      .select()
      .single();

    throwIfError(error);
    return toMedioPago(data);
  }

  async update(id: string, dto: UpdateMedioPagoDto): Promise<MedioPago> {
    const patch: Record<string, unknown> = {};
    if (dto.nombre !== undefined) patch['nombre'] = dto.nombre;
    if (dto.tipo !== undefined) patch['tipo'] = dto.tipo;

    const { data, error } = await this.supabase.client
      .from('medios_pago')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Medio de pago no encontrado');
    return toMedioPago(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('medios_pago').delete().eq('id', id);
    throwIfError(error);
  }
}
