-- Movimientos: cada entrada o salida de plata de una cuenta. Los saldos
-- de las cuentas se mantienen con estos movimientos: las funciones de
-- abajo insertan o borran el movimiento y ajustan los saldos en una sola
-- transaccion. Corregir un saldo a mano queda como movimiento de ajuste.
--
-- Convencion: la plata sale de cuenta_origen y entra a cuenta_destino.
-- En una tarjeta de credito el saldo es deuda, asi que lo que sale de
-- la tarjeta (una compra) la aumenta y lo que entra (un pago) la reduce.

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  fecha date not null,
  tipo text not null check (tipo in ('ingreso', 'gasto', 'pago_obligacion', 'transferencia', 'ajuste')),
  cuenta_origen_id uuid references cuentas (id) on delete set null,
  cuenta_destino_id uuid references cuentas (id) on delete set null,
  monto numeric(14, 2) not null check (monto > 0),
  -- Solo en transferencias entre cuentas de distinta moneda: lo que
  -- llega a la cuenta destino, en su propia moneda.
  monto_destino numeric(14, 2) check (monto_destino > 0),
  descripcion text not null default '',
  gasto_id uuid,
  pago_id uuid,
  ingreso_id uuid,
  created_at timestamptz not null default now()
);

create index idx_movimientos_hogar_fecha on movimientos (hogar_id, fecha desc);
create index idx_movimientos_origen on movimientos (cuenta_origen_id);
create index idx_movimientos_destino on movimientos (cuenta_destino_id);
create index idx_movimientos_gasto on movimientos (gasto_id);
create index idx_movimientos_pago on movimientos (pago_id);

-- Confirmacion de que un ingreso recurrente llego en un mes (o de que se
-- descarto sin registrarlo, con movimiento_id null).
create table ingreso_recepciones (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  ingreso_id uuid not null,
  periodo date not null, -- primer dia del mes
  movimiento_id uuid references movimientos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ingreso_id, periodo)
);

alter table gastos add column cuenta_id uuid references cuentas (id) on delete set null;
alter table pagos add column cuenta_id uuid references cuentas (id) on delete set null;

-- p_signo = 1 aplica el movimiento, -1 lo revierte.
create function aplicar_movimiento(p_origen uuid, p_destino uuid, p_monto numeric, p_monto_destino numeric, p_signo int)
returns void
language plpgsql
as $$
begin
  update cuentas
     set saldo = saldo + p_signo * (case when tipo = 'tarjeta_credito' then p_monto else -p_monto end),
         saldo_actualizado_en = (now() at time zone 'America/Bogota')::date
   where id = p_origen;

  update cuentas
     set saldo = saldo + p_signo * (case when tipo = 'tarjeta_credito' then -1 else 1 end) * coalesce(p_monto_destino, p_monto),
         saldo_actualizado_en = (now() at time zone 'America/Bogota')::date
   where id = p_destino;
end;
$$;

create function registrar_movimiento(
  p_hogar uuid,
  p_fecha date,
  p_tipo text,
  p_origen uuid,
  p_destino uuid,
  p_monto numeric,
  p_monto_destino numeric default null,
  p_descripcion text default '',
  p_gasto uuid default null,
  p_pago uuid default null,
  p_ingreso uuid default null
)
returns movimientos
language plpgsql
as $$
declare
  m movimientos;
begin
  insert into movimientos (hogar_id, fecha, tipo, cuenta_origen_id, cuenta_destino_id, monto, monto_destino,
                           descripcion, gasto_id, pago_id, ingreso_id)
  values (p_hogar, p_fecha, p_tipo, p_origen, p_destino, p_monto, p_monto_destino,
          coalesce(p_descripcion, ''), p_gasto, p_pago, p_ingreso)
  returning * into m;

  perform aplicar_movimiento(p_origen, p_destino, p_monto, p_monto_destino, 1);
  return m;
end;
$$;

create function eliminar_movimiento(p_id uuid)
returns void
language plpgsql
as $$
declare
  m movimientos;
begin
  delete from movimientos where id = p_id returning * into m;
  if found then
    perform aplicar_movimiento(m.cuenta_origen_id, m.cuenta_destino_id, m.monto, m.monto_destino, -1);
  end if;
end;
$$;

-- Lleva el saldo de una cuenta a p_nuevo_saldo registrando la diferencia
-- como un movimiento de ajuste.
create function ajustar_saldo(p_cuenta uuid, p_nuevo_saldo numeric, p_fecha date, p_descripcion text)
returns void
language plpgsql
as $$
declare
  c cuentas;
  diferencia numeric;
begin
  select * into c from cuentas where id = p_cuenta for update;
  if not found then
    raise exception 'Cuenta no encontrada';
  end if;

  diferencia := p_nuevo_saldo - c.saldo;
  if diferencia = 0 then
    return;
  end if;

  -- Subir el saldo de una cuenta es plata que entra; subir la deuda de
  -- una tarjeta es plata que sale de ella.
  if (diferencia > 0) <> (c.tipo = 'tarjeta_credito') then
    perform registrar_movimiento(c.hogar_id, p_fecha, 'ajuste', null, p_cuenta, abs(diferencia), null, p_descripcion);
  else
    perform registrar_movimiento(c.hogar_id, p_fecha, 'ajuste', p_cuenta, null, abs(diferencia), null, p_descripcion);
  end if;
end;
$$;
