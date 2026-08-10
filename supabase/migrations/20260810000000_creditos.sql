-- Una obligacion se considera "credito" cuando tiene banco asignado.
-- No se agrega un flag "es_credito" aparte: banco no nulo ya cumple ese rol.

alter table obligaciones
  add column banco text,
  add column tasa_interes numeric(5, 2) check (tasa_interes >= 0); -- tasa efectiva anual (%)
