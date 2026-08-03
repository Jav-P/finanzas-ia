import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateIngresoDto, Ingreso, UpdateIngresoDto } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toIngreso } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

@Injectable()
export class IngresosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Ingreso[]> {
    const { data, error } = await this.supabase.client
      .from('ingresos')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('created_at');

    throwIfError(error);
    return (data ?? []).map(toIngreso);
  }

  async create(dto: CreateIngresoDto): Promise<Ingreso> {
    const { data, error } = await this.supabase.client
      .from('ingresos')
      .insert({
        hogar_id: dto.hogarId,
        usuario_id: dto.usuarioId,
        descripcion: dto.descripcion,
        monto: dto.monto,
        periodicidad: dto.periodicidad,
        dia_pago: dto.diaPago ?? null,
        fecha_inicio: dto.fechaInicio,
      })
      .select()
      .single();

    throwIfError(error);
    return toIngreso(data);
  }

  async update(id: string, dto: UpdateIngresoDto): Promise<Ingreso> {
    const patch: Record<string, unknown> = {};
    if (dto.usuarioId !== undefined) patch['usuario_id'] = dto.usuarioId;
    if (dto.descripcion !== undefined) patch['descripcion'] = dto.descripcion;
    if (dto.monto !== undefined) patch['monto'] = dto.monto;
    if (dto.periodicidad !== undefined) patch['periodicidad'] = dto.periodicidad;
    if (dto.diaPago !== undefined) patch['dia_pago'] = dto.diaPago;
    if (dto.fechaInicio !== undefined) patch['fecha_inicio'] = dto.fechaInicio;

    const { data, error } = await this.supabase.client
      .from('ingresos')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Ingreso no encontrado');
    return toIngreso(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('ingresos').delete().eq('id', id);
    throwIfError(error);
  }
}
