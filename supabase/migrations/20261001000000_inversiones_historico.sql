-- Inversiones (CDT, fondos, acciones): cuentas cuyo saldo es su valor
-- actual. Suman al patrimonio pero no a la plata disponible.
alter table cuentas drop constraint cuentas_tipo_check;
alter table cuentas
  add constraint cuentas_tipo_check check (tipo in ('efectivo', 'ahorros', 'bolsillo', 'tarjeta_credito', 'inversion'));

-- Una fila por hogar y mes con el patrimonio de ese mes. Se reescribe
-- mientras el mes esta en curso, asi que queda el ultimo valor del mes.
create table patrimonio_historico (
  hogar_id uuid not null,
  periodo date not null, -- primer dia del mes
  disponible numeric(14, 2) not null,
  inversiones numeric(14, 2) not null,
  deudas numeric(14, 2) not null,
  patrimonio_neto numeric(14, 2) not null,
  actualizado_en timestamptz not null default now(),
  primary key (hogar_id, periodo)
);
