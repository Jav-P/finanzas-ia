-- Bucket privado para los comprobantes de pago (imagen/PDF).
-- Se sube y se lee siempre a traves del backend (service_role), nunca
-- directo desde el navegador, asi que no necesita politicas publicas.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;
