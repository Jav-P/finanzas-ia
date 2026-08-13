// El backend maneja fechas como strings ISO 'YYYY-MM-DD'; el datepicker
// de Material trabaja con objetos Date. Estas funciones convierten entre
// los dos evitando el corrimiento de un dia por zona horaria que da
// `new Date('YYYY-MM-DD')` (lo interpreta como UTC medianoche).

export function dateToIso(date: Date | null): string | null {
  if (!date) return null;
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}
