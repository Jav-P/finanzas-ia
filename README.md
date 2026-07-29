# finanzas-ia

App de finanzas en pareja: seguimiento de obligaciones mensuales, comprobantes de pago y alertas antes de cada vencimiento. Contexto completo en [finanzas_pareja.md](finanzas_pareja.md).

Monorepo Nx con Angular + NestJS + Supabase.

## Estructura

- `apps/frontend` — Angular (PWA).
- `apps/backend` — NestJS (API).
- `libs/shared-types` — interfaces TypeScript compartidas entre frontend y backend (`@finanzas-ia/shared-types`), reflejan el esquema en `supabase/migrations/`.
- `supabase/` — esquema de base de datos y config de Supabase CLI para desarrollo local (Postgres + Auth + Storage vía Docker).
- `docs/flujo_pantallas.md` — flujo de pantallas del MVP.

## Desarrollo local

```bash
npm install

# Base de datos local (requiere Docker Desktop corriendo)
npx supabase start

# Frontend
npx nx serve frontend

# Backend
npx nx serve backend
```

## Comandos útiles

- `npx nx build <app>` — build de producción.
- `npx nx test <app>` — tests unitarios.
- `npx nx graph` — visualizar el grafo de dependencias entre apps/libs.
