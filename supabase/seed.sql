-- Datos base para desarrollo local. Se aplica automaticamente con
-- `supabase db reset` (o `supabase start` la primera vez).
-- El email de Xime es un placeholder: cambialo aqui cuando conectemos
-- Supabase Auth de verdad.

insert into hogares (id, nombre) values
  ('11111111-1111-1111-1111-111111111111', 'Javi y Xime');

insert into usuarios (id, hogar_id, nombre, email) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Javi', 'javierandrespp@hotmail.com'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Xime', 'xime@example.com');

insert into categorias (hogar_id, nombre, color) values
  ('11111111-1111-1111-1111-111111111111', 'Arriendo', '#4F46E5'),
  ('11111111-1111-1111-1111-111111111111', 'Servicios', '#0EA5E9'),
  ('11111111-1111-1111-1111-111111111111', 'Creditos', '#DC2626'),
  ('11111111-1111-1111-1111-111111111111', 'Administracion', '#7C3AED'),
  ('11111111-1111-1111-1111-111111111111', 'Mercado', '#16A34A'),
  ('11111111-1111-1111-1111-111111111111', 'Aseo', '#0D9488'),
  ('11111111-1111-1111-1111-111111111111', 'Otros', '#6B7280');

insert into medios_pago (hogar_id, nombre, tipo) values
  ('11111111-1111-1111-1111-111111111111', 'Efectivo', 'efectivo'),
  ('11111111-1111-1111-1111-111111111111', 'Transferencia', 'transferencia');
