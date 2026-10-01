-- Varias cosas que quedaron pendientes desde las fases anteriores:
--
-- 1) Bienes fisicos (carro, apartamento): un tipo de cuenta mas, igual
--    de simple que "inversion" (valor manual, sin movimientos).
-- 2) Divisas: cuentas en USD/EUR, con una tabla de tasas de cambio que
--    llena un cron diario (consultando una API externa).
-- 3) Recordatorio de vencimiento de obligaciones por correo (3 dias y
--    1 dia antes): columnas para no mandar el mismo aviso dos veces.
-- 4) Tarjetas de credito con ciclo de corte: cupo total, dia de corte
--    y dia limite de pago, mas su propia tabla de avisos ya enviados
--    (no son booleanos como en obligaciones porque el ciclo se repite
--    cada mes con una fecha limite distinta).

alter table cuentas drop constraint cuentas_tipo_check;
alter table cuentas
  add constraint cuentas_tipo_check check (tipo in ('efectivo', 'ahorros', 'bolsillo', 'tarjeta_credito', 'inversion', 'bien'));

alter table cuentas add column moneda text not null default 'COP' check (moneda in ('COP', 'USD', 'EUR'));
alter table cuentas add column cupo_total numeric(14, 2);
alter table cuentas add column dia_corte smallint check (dia_corte between 1 and 28);
alter table cuentas add column dia_pago smallint check (dia_pago between 1 and 28);

alter table patrimonio_historico add column bienes numeric(14, 2) not null default 0;

-- valor_cop = cuantos pesos colombianos vale 1 unidad de esa moneda.
create table tasas_cambio (
  fecha date not null,
  moneda text not null check (moneda in ('USD', 'EUR')),
  valor_cop numeric(14, 4) not null,
  actualizado_en timestamptz not null default now(),
  primary key (fecha, moneda)
);

alter table obligacion_instancias add column aviso_3d_enviado boolean not null default false;
alter table obligacion_instancias add column aviso_1d_enviado boolean not null default false;

create table tarjeta_avisos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas (id) on delete cascade,
  fecha_limite_pago date not null,
  dias_antes smallint not null,
  enviado_en timestamptz not null default now(),
  unique (cuenta_id, fecha_limite_pago, dias_antes)
);
