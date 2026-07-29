-- Da acceso al rol service_role (el que usa el backend NestJS, con la
-- service_role key) sobre las tablas del schema. No se otorga a
-- anon/authenticated todavia porque las políticas RLS estan pendientes
-- (ver nota en 20260703000000_init_schema.sql).

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
