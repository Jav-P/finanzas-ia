import { MatDateFormats } from '@angular/material/core';

// Formato de fecha para pickers que solo eligen mes+año: se muestra
// "agosto de 2026" en vez del formato de fecha completa del resto de
// la app.
export const FORMATO_MES_ANIO: MatDateFormats = {
  parse: { dateInput: { year: 'numeric', month: 'long' } },
  display: {
    dateInput: { year: 'numeric', month: 'long' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

export function periodoDe(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function periodoMasMeses(periodo: string, meses: number): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return periodoDe(new Date(anio, mes - 1 + meses, 1));
}

export function periodoActual(): string {
  return periodoDe(new Date());
}
