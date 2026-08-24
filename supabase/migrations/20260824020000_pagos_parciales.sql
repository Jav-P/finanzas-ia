-- Permite varios pagos por instancia (pagos parciales que en total no
-- deben superar el monto de la obligacion): antes "instancia_id" era
-- unique, forzando un solo comprobante por cuota.
alter table pagos drop constraint if exists pagos_instancia_id_key;

create index if not exists idx_pagos_instancia_id on pagos (instancia_id);
