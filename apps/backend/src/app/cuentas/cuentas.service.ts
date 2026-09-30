import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCuentaDto, Cuenta, Patrimonio, PatrimonioMes, UpdateCuentaDto } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { toCuenta } from '../common/mappers';
import { throwIfError } from '../common/throw-if-error';
import { hoyColombia } from '../common/period';

const TIPOS_DISPONIBLES = ['efectivo', 'ahorros', 'bolsillo'];

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
      patch['saldo_actualizado_en'] = hoyColombia();
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

  // Lo que se tiene (plata disponible e inversiones) menos lo que se debe
  // (tarjetas y el saldo pendiente registrado de los creditos activos).
  async patrimonio(hogarId: string): Promise<Patrimonio> {
    const cuentas = await this.findByHogar(hogarId);
    const sumar = (tipos: string[]) =>
      cuentas.filter((c) => tipos.includes(c.tipo)).reduce((suma, c) => suma + c.saldo, 0);
    const disponible = sumar(TIPOS_DISPONIBLES);
    const inversiones = sumar(['inversion']);
    const deudaTarjetas = sumar(['tarjeta_credito']);

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
      disponible,
      inversiones,
      deudaTarjetas,
      deudaCreditos,
      creditosSinSaldo: (creditos ?? []).length - conSaldo.length,
      patrimonioNeto: disponible + inversiones - deudaTarjetas - deudaCreditos,
    };
  }

  // Guarda (o reescribe) el patrimonio del mes en curso. Lo llama el cron
  // diario y tambien la consulta del historico, para que el mes actual
  // siempre refleje los saldos de hoy.
  async registrarFoto(hogarId: string): Promise<void> {
    const p = await this.patrimonio(hogarId);
    const { error } = await this.supabase.client.from('patrimonio_historico').upsert({
      hogar_id: hogarId,
      periodo: `${hoyColombia().slice(0, 7)}-01`,
      disponible: p.disponible,
      inversiones: p.inversiones,
      deudas: p.deudaTarjetas + p.deudaCreditos,
      patrimonio_neto: p.patrimonioNeto,
      actualizado_en: new Date().toISOString(),
    });
    throwIfError(error);
  }

  async historico(hogarId: string): Promise<PatrimonioMes[]> {
    await this.registrarFoto(hogarId);
    const { data, error } = await this.supabase.client
      .from('patrimonio_historico')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('periodo', { ascending: false })
      .limit(24);
    throwIfError(error);

    return (data ?? []).reverse().map((row: any) => ({
      periodo: String(row.periodo).slice(0, 7),
      disponible: Number(row.disponible),
      inversiones: Number(row.inversiones),
      deudas: Number(row.deudas),
      patrimonioNeto: Number(row.patrimonio_neto),
    }));
  }

  async hogaresConCuentas(): Promise<string[]> {
    const { data, error } = await this.supabase.client.from('cuentas').select('hogar_id');
    throwIfError(error);
    return [...new Set((data ?? []).map((row: any) => row.hogar_id as string))];
  }
}
