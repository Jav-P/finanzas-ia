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

Necesitas 3 piezas corriendo a la vez: Supabase (base de datos + auth + storage), el backend y el frontend.

### 1. Instalar dependencias (una sola vez)

```bash
npm install
cp .env.example .env   # completar ANTHROPIC_API_KEY si vas a probar OCR; el resto ya trae valores de desarrollo local
```

### 2. Levantar Supabase local (requiere Docker Desktop corriendo)

```bash
npx supabase start
```

Si agregaste una migración nueva y quieres partir de una base limpia (esto borra los datos):

```bash
npx supabase db reset
```

`supabase stop` + `supabase start` reutiliza el volumen existente y **no** reaplica migraciones nuevas — para eso hace falta `db reset`.

### 3. Levantar el backend

```bash
npx nx serve backend
```

Queda en `http://localhost:3010/api`.

### 4. Levantar el frontend

```bash
npx nx serve frontend
```

Queda en `http://localhost:4210`.

### URLs útiles en desarrollo

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:4210 |
| Backend API | http://localhost:3010/api |
| Supabase Studio (ver/editar tablas a mano) | http://localhost:54323 |
| Mailpit (bandeja de correos de prueba) | http://localhost:54324 |

## Comandos útiles

- `npx nx build <app>` — build de producción.
- `npx nx test <app>` — tests unitarios.
- `npx nx graph` — visualizar el grafo de dependencias entre apps/libs.
