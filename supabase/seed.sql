-- Datos base para desarrollo local. Se aplica automaticamente con
-- `supabase db reset` (o `supabase start` la primera vez).
--
-- Ya no se siembra un hogar/usuarios fijos: con el registro real
-- (Supabase Auth) cada quien crea su propio hogar o se une por
-- invitacion. Las categorias globales (hogar_id = null) quedan
-- disponibles para cualquier hogar nuevo desde el primer momento.

insert into categorias (hogar_id, nombre, color) values
  (null, 'Arriendo', '#4F46E5'),
  (null, 'Servicios', '#0EA5E9'),
  (null, 'Creditos', '#DC2626'),
  (null, 'Administracion', '#7C3AED'),
  (null, 'Mercado', '#16A34A'),
  (null, 'Aseo', '#0D9488'),
  (null, 'Otros', '#6B7280');
