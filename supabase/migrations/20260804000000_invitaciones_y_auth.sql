-- Soporte para registro real (Supabase Auth) e invitaciones a un hogar.

-- Un usuario recien registrado por invitacion no pertenece a ningun
-- hogar hasta que acepta la invitacion explicitamente.
alter table usuarios alter column hogar_id drop not null;

create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null,
  token uuid not null default gen_random_uuid(),
  email text, -- null = link generico para compartir a mano
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  invitado_por uuid not null, -- usuarios.id de quien invito
  created_at timestamptz not null default now(),
  unique (token)
);

create index idx_invitaciones_token on invitaciones (token);
