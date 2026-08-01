import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateObligacionDto,
  Obligacion,
  UpdateObligacionDto,
} from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toObligacion } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

function firstDayOfMonth(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

@Injectable()
export class ObligacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateObligacionDto): Promise<Obligacion> {
    const { data: obligacionRow, error } = await this.supabase.client
      .from('obligaciones')
      .insert({
        hogar_id: dto.hogarId,
        usuario_responsable_id: dto.usuarioResponsableId ?? null,
        categoria_id: dto.categoriaId,
        descripcion: dto.descripcion,
        monto: dto.monto,
        recurrencia: dto.recurrencia,
        dia_vencimiento: dto.diaVencimiento ?? null,
        fecha_inicio: dto.fechaInicio,
      })
      .select()
      .single();

    throwIfError(error);

    // La primera instancia se genera de inmediato; las siguientes (para
    // obligaciones mensuales) las genera el job recurrente (pendiente).
    const { error: instanciaError } = await this.supabase.client
      .from('obligacion_instancias')
      .insert({
        obligacion_id: obligacionRow.id,
        periodo: firstDayOfMonth(dto.fechaInicio),
        fecha_vencimiento: dto.fechaInicio,
        monto: dto.monto,
      });

    throwIfError(instanciaError);

    return toObligacion(obligacionRow);
  }

  async findOne(id: string): Promise<Obligacion> {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }

  async update(id: string, dto: UpdateObligacionDto): Promise<Obligacion> {
    const patch: Record<string, unknown> = {};
    if (dto.usuarioResponsableId !== undefined) patch['usuario_responsable_id'] = dto.usuarioResponsableId;
    if (dto.categoriaId !== undefined) patch['categoria_id'] = dto.categoriaId;
    if (dto.descripcion !== undefined) patch['descripcion'] = dto.descripcion;
    if (dto.monto !== undefined) patch['monto'] = dto.monto;
    if (dto.recurrencia !== undefined) patch['recurrencia'] = dto.recurrencia;
    if (dto.diaVencimiento !== undefined) patch['dia_vencimiento'] = dto.diaVencimiento;
    if (dto.fechaInicio !== undefined) patch['fecha_inicio'] = dto.fechaInicio;

    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }

  async desactivar(id: string): Promise<Obligacion> {
    const { data, error } = await this.supabase.client
      .from('obligaciones')
      .update({ activa: false })
      .eq('id', id)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Obligacion no encontrada');
    return toObligacion(data);
  }
}
