-- Un presupuesto "fijo" aplica automaticamente mes a mes (ej. mercado)
-- hasta que se edite o se borre; uno normal solo aplica al periodo
-- exacto con el que se creo. La resolucion (cual gana si hay ambos
-- para el mismo mes) vive en PresupuestosService.resumen().

alter table presupuestos
  add column es_fijo boolean not null default false;
