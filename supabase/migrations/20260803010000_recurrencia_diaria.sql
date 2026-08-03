-- Permite 'diaria' en obligaciones.recurrencia: unicamente para poder
-- probar el generador de instancias en dias en vez de esperar un mes
-- calendario completo. No aplica a ingresos.periodicidad.

alter table obligaciones drop constraint obligaciones_recurrencia_check;
alter table obligaciones
  add constraint obligaciones_recurrencia_check
  check (recurrencia in ('unica', 'mensual', 'diaria'));
