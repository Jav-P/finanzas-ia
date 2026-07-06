-- Finanzas en Pareja — esquema inicial (Supabase/Postgres)
-- Convenciones: uuid como PK, timestamptz para auditoría, snake_case.
-- Las relaciones entre tablas se representan con columnas *_id planas,
-- sin foreign keys ni cascadas a nivel de Postgres: la integridad
-- referencial y el borrado en cascada los maneja el backend (NestJS).

create extension if not exists "pgcrypto";

-- Un hogar agrupa a las personas que comparten finanzas (en este caso, 2).
create table hogares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- usuarios.id coincide con auth.users.id (Supabase Auth).
create table usuarios (
  id uuid primary key,
  hogar_id uuid not null,
  nombre text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- categorias globales tienen hogar_id = null (seed); un hogar puede crear las suyas.
create table categorias (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid,
  nombre text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (hogar_id, nombre)
);

-- Plantilla de obligación: define QUÉ es y CADA CUÁNTO se repite, no su estado.
create table obligaciones (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  usuario_responsable_id uuid, -- null = compartida
  categoria_id uuid not null,
  descripcion text not null,
  monto numeric(12, 2) not null,
  recurrencia text not null check (recurrencia in ('unica', 'mensual')),
  dia_vencimiento smallint check (dia_vencimiento between 1 and 31), -- solo aplica si recurrencia = 'mensual'
  fecha_inicio date not null, -- fecha de vencimiento si es 'unica'; primer período si es 'mensual'
  activa boolean not null default true, -- false = ya no genera nuevas instancias
  created_at timestamptz not null default now()
);

-- Una fila por período real de cobro. Aquí vive el estado (pendiente/pagado/vencido),
-- no en la obligación, porque una obligación mensual tiene un estado distinto cada mes.
create table obligacion_instancias (
  id uuid primary key default gen_random_uuid(),
  obligacion_id uuid not null,
  periodo date not null, -- primer día del mes/período que representa esta instancia
  fecha_vencimiento date not null,
  monto numeric(12, 2) not null, -- copiado de obligaciones.monto al generarse (histórico si el monto cambia después)
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'vencido')),
  created_at timestamptz not null default now(),
  unique (obligacion_id, periodo)
);

-- Respaldo de un pago realizado sobre una instancia. 1:1 para el MVP (sin pagos parciales).
create table pagos (
  id uuid primary key default gen_random_uuid(),
  instancia_id uuid not null unique,
  usuario_pago_id uuid not null,
  fecha_pago date not null,
  monto_pagado numeric(12, 2) not null,
  url_comprobante text not null, -- ruta en Supabase Storage
  created_at timestamptz not null default now()
);

create index idx_obligacion_instancias_estado_vencimiento
  on obligacion_instancias (estado, fecha_vencimiento);

-- RLS: pendiente de definir cuando se conecte Supabase Auth.
-- Idea base: cada tabla filtra por hogar_id = (select hogar_id from usuarios where id = auth.uid()).
