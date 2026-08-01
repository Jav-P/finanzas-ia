-- Segunda fase: ingresos, gastos variables (con items y calificacion),
-- catalogos (medios de pago, lugares, productos) y presupuestos.
-- Misma convencion que el resto del schema: columnas *_id planas, sin
-- FKs ni cascadas a nivel de Postgres.

create table ingresos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  usuario_id uuid not null,
  descripcion text not null,
  monto numeric(12, 2) not null,
  periodicidad text not null check (periodicidad in ('unica', 'mensual')),
  dia_pago smallint check (dia_pago between 1 and 31), -- solo aplica si periodicidad = 'mensual'
  fecha_inicio date not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table medios_pago (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'debito', 'credito', 'transferencia')),
  created_at timestamptz not null default now(),
  unique (hogar_id, nombre)
);

create table lugares (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (hogar_id, nombre)
);

-- Catalogo libre de productos; categoria_id reutiliza la tabla categorias
-- (ej. "Carnes", "Aseo", "Papeleria") en vez de crear otra taxonomia.
create table productos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  categoria_id uuid,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (hogar_id, nombre)
);

-- Gasto variable puntual (mercado, recibos, etc). A diferencia de
-- obligaciones, no tiene fecha de vencimiento ni recurrencia: es un
-- registro de algo que ya se pago.
create table gastos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  usuario_id uuid not null,
  categoria_id uuid not null,
  lugar_id uuid,
  medio_pago_id uuid,
  descripcion text not null,
  monto_total numeric(12, 2) not null,
  fecha date not null,
  url_comprobante text,
  created_at timestamptz not null default now()
);

-- Lineas de un gasto (ej. cada producto de la boleta del mercado).
-- La calificacion vive aqui: califica esa compra puntual del producto
-- en ese lugar, para decidir si volver a comprar ahi.
create table gasto_items (
  id uuid primary key default gen_random_uuid(),
  gasto_id uuid not null,
  producto_id uuid not null,
  cantidad numeric(12, 3) not null default 1,
  precio_unitario numeric(12, 2) not null,
  calificacion smallint check (calificacion between 1 and 5),
  created_at timestamptz not null default now()
);

create table presupuestos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  categoria_id uuid not null,
  periodo date not null, -- primer dia del mes
  monto_presupuestado numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (hogar_id, categoria_id, periodo)
);

create index idx_gastos_hogar_fecha on gastos (hogar_id, fecha);
create index idx_gasto_items_producto on gasto_items (producto_id);
create index idx_ingresos_hogar on ingresos (hogar_id);
