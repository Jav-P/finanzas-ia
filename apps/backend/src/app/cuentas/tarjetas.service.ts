import { Injectable } from '@nestjs/common';
import type { TarjetaCiclo } from '@finanzas-ia/shared-types';
import { CuentasService } from './cuentas.service';
import { hoyColombia } from '../common/period';

// Dado un dia del mes (1-28, ver check de la columna), la proxima vez
// que cae ese dia desde hoy (incluyendo hoy mismo).
export function proximaFechaDelMes(dia: number, hoy: string): string {
  const [anio, mes, diaHoy] = hoy.split('-').map(Number);
  if (diaHoy <= dia) {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  const fecha = new Date(Date.UTC(anio, mes, dia)); // mes (sin -1) = siguiente mes
  return fecha.toISOString().slice(0, 10);
}

@Injectable()
export class TarjetasService {
  constructor(private readonly cuentas: CuentasService) {}

  async ciclos(hogarId: string): Promise<TarjetaCiclo[]> {
    const cuentas = await this.cuentas.findByHogar(hogarId);
    const hoy = hoyColombia();

    return cuentas
      .filter((c) => c.tipo === 'tarjeta_credito')
      .map((c) => ({
        cuentaId: c.id,
        cupoTotal: c.cupoTotal,
        cupoDisponible: c.cupoTotal != null ? c.cupoTotal - c.saldo : null,
        proximaFechaCorte: c.diaCorte != null ? proximaFechaDelMes(c.diaCorte, hoy) : null,
        proximaFechaPago: c.diaPago != null ? proximaFechaDelMes(c.diaPago, hoy) : null,
      }));
  }
}
