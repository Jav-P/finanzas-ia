import { Injectable, Logger } from '@nestjs/common';
import type { TasaCambio } from '@finanzas-ia/shared-types';
import { SupabaseService } from '../supabase/supabase.service';
import { hoyColombia } from '../common/period';

const API_URL = 'https://open.er-api.com/v6/latest/USD';

@Injectable()
export class TasasCambioService {
  private readonly logger = new Logger(TasasCambioService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Una sola llamada (base USD) nos da COP por USD y EUR por USD;
  // COP por EUR sale de dividir el primero entre el segundo. Gratis,
  // sin api key (open.er-api.com).
  async actualizar(): Promise<void> {
    let data: { rates?: Record<string, number> };
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (error) {
      this.logger.error('No se pudo consultar la API de tasas de cambio', error instanceof Error ? error.stack : error);
      return;
    }

    const copPorUsd = data.rates?.['COP'];
    const eurPorUsd = data.rates?.['EUR'];
    if (!copPorUsd || !eurPorUsd) {
      this.logger.error('La API de tasas de cambio no devolvio COP o EUR');
      return;
    }
    const copPorEur = copPorUsd / eurPorUsd;

    const hoy = hoyColombia();
    const { error } = await this.supabase.client.from('tasas_cambio').upsert([
      { fecha: hoy, moneda: 'USD', valor_cop: copPorUsd },
      { fecha: hoy, moneda: 'EUR', valor_cop: copPorEur },
    ]);
    if (error) this.logger.error('No se pudo guardar la tasa de cambio del dia', error.message);
  }

  // La ultima tasa conocida de cada moneda (no necesariamente de hoy:
  // si el cron no ha corrido todavia, usa la de ayer).
  async ultimasTasas(): Promise<Record<'USD' | 'EUR', number>> {
    const resultado: Record<'USD' | 'EUR', number> = { USD: 0, EUR: 0 };
    for (const moneda of ['USD', 'EUR'] as const) {
      const { data } = await this.supabase.client
        .from('tasas_cambio')
        .select('valor_cop')
        .eq('moneda', moneda)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();
      resultado[moneda] = data ? Number(data.valor_cop) : 0;
    }
    return resultado;
  }

  async historico(dias = 30): Promise<TasaCambio[]> {
    const { data, error } = await this.supabase.client
      .from('tasas_cambio')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(dias * 2);
    if (error) return [];

    return (data ?? [])
      .map((row: any) => ({ fecha: row.fecha, moneda: row.moneda, valorCop: Number(row.valor_cop) }))
      .reverse();
  }
}
