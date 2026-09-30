-- Cuentas: cada lugar donde el hogar tiene plata (efectivo, cuentas de
-- banco, bolsillos) o la debe (tarjetas de credito). Base para el
-- patrimonio neto. Por ahora el saldo se registra a mano; los
-- movimientos entre cuentas vienen despues.
--
-- En tarjeta_credito, "saldo" es lo que se debe (positivo).
-- Un bolsillo cuelga de una cuenta de ahorros (cuenta_padre_id) solo
-- para agruparlo; su saldo es aparte del de la cuenta padre.

create table cuentas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'ahorros', 'bolsillo', 'tarjeta_credito')),
  cuenta_padre_id uuid references cuentas (id),
  saldo numeric(14, 2) not null default 0,
  saldo_actualizado_en date not null default current_date,
  created_at timestamptz not null default now(),
  check ((tipo = 'bolsillo') = (cuenta_padre_id is not null))
);

create index idx_cuentas_hogar on cuentas (hogar_id);
