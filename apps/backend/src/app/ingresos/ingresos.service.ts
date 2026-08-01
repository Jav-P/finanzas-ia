import { Injectable } from '@nestjs/common';
import type { CreateIngresoDto, Ingreso } from '@finanzas-ia/shared-types';
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
}
