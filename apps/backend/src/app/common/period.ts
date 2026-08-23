// periodo llega como 'YYYY-MM' en la mayoria de endpoints de reportes.

export function periodStart(periodo: string): string {
  return `${periodo}-01`;
}

export function periodEnd(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${periodo}-${String(lastDay).padStart(2, '0')}`;
}

// 'YYYY-MM' + N meses -> 'YYYY-MM' (N puede ser negativo).
export function addMeses(periodo: string, meses: number): string {
  const [year, month] = periodo.split('-').map(Number);
  const fecha = new Date(year, month - 1 + meses, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

// 'YYYY-MM' -> "agosto de 2026", para mensajes en texto (recomendaciones).
export function periodLabel(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}
