import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCuentaDto, Cuenta, Patrimonio, UpdateCuentaDto } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCuenta } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class CuentasService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByHogar(hogarId: string): Promise<Cuenta[]> {
    const { data, error } = await this.supabase.client
      .from('cuentas')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('created_at');

    throwIfError(error);
    return (data ?? []).map(toCuenta);
  }

  async create(hogarId: string, dto: CreateCuentaDto): Promise<Cuenta> {
    const esBolsillo = dto.tipo === 'bolsillo';
    if (esBolsillo) {
      const { data: padre, error } = await this.supabase.client
        .from('cuentas')
        .select('tipo')
        .eq('id', dto.cuentaPadreId ?? '')
        .eq('hogar_id', hogarId)
        .maybeSingle();
      throwIfError(error);
      if (!padre || padre.tipo !== 'ahorros') {
        throw new BadRequestException('Un bolsillo debe pertenecer a una de tus cuentas de ahorros');
      }
    }

    const { data, error } = await this.supabase.client
      .from('cuentas')
      .insert({
        hogar_id: hogarId,
        nombre: dto.nombre,
        tipo: dto.tipo,
        cuenta_padre_id: esBolsillo ? dto.cuentaPadreId : null,
        saldo: dto.saldo ?? 0,
      })
      .select()
      .single();

    throwIfError(error);
    return toCuenta(data);
  }

  async update(hogarId: string, id: string, dto: UpdateCuentaDto): Promise<Cuenta> {
    const patch: Record<string, unknown> = {};
    if (dto.nombre !== undefined) patch['nombre'] = dto.nombre;
    if (dto.saldo !== undefined) {
      patch['saldo'] = dto.saldo;
      patch['saldo_actualizado_en'] = hoyIso();
    }

    const { data, error } = await this.supabase.client
      .from('cuentas')
      .update(patch)
      .eq('id', id)
      .eq('hogar_id', hogarId)
      .select()
      .maybeSingle();

    throwIfError(error);
    if (!data) throw new NotFoundException('Cuenta no encontrada');
    return toCuenta(data);
  }

  async remove(hogarId: string, id: string): Promise<void> {
    const { count, error: countError } = await this.supabase.client
      .from('cuentas')
      .select('id', { count: 'exact', head: true })
      .eq('cuenta_padre_id', id);
    throwIfError(countError);
    if (count) {
      throw new BadRequestException('Esta cuenta tiene bolsillos: elimínalos primero');
    }

    const { error } = await this.supabase.client.from('cuentas').delete().eq('id', id).eq('hogar_id', hogarId);
    throwIfError(error);
  }

  // Lo que se tiene (efectivo, cuentas, bolsillos) menos lo que se debe
  // (tarjetas y el saldo pendiente registrado de los creditos activos).
  async patrimonio(hogarId: string): Promise<Patrimonio> {
    const cuentas = await this.findByHogar(hogarId);
    const activos = cuentas.filter((c) => c.tipo !== 'tarjeta_credito').reduce((suma, c) => suma + c.saldo, 0);
    const deudaTarjetas = cuentas.filter((c) => c.tipo === 'tarjeta_credito').reduce((suma, c) => suma + c.saldo, 0);

    const { data: creditos, error } = await this.supabase.client
      .from('obligaciones')
      .select('saldo_pendiente')
      .eq('hogar_id', hogarId)
      .eq('activa', true)
      .not('banco', 'is', null);
    throwIfError(error);

    const conSaldo = (creditos ?? []).filter((c: any) => c.saldo_pendiente != null);
    const deudaCreditos = conSaldo.reduce((suma: number, c: any) => suma + Number(c.saldo_pendiente), 0);

    return {
      activos,
      deudaTarjetas,
      deudaCreditos,
      creditosSinSaldo: (creditos ?? []).length - conSaldo.length,
      patrimonioNeto: activos - deudaTarjetas - deudaCreditos,
    };
  }
}
