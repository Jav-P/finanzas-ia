// periodo llega como 'YYYY-MM' en la mayoria de endpoints de reportes.

export function periodStart(periodo: string): string {
  return `${periodo}-01`;
}

export function periodEnd(periodo: string): string {
  const [year, month] = periodo.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${periodo}-${String(lastDay).padStart(2, '0')}`;
}
