# ZLT Marketing CRM

App interna para gestionar la base unificada de contactos y touchpoints de marketing de ZLT.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + componentes UI propios (shadcn-style)
- Supabase (Postgres + Auth) vía `@supabase/ssr`
- Deploy: Vercel

## Correr local

```bash
pnpm install
cp .env.example .env.local   # completar con credenciales
pnpm dev
```

Abrir http://localhost:3000

## Variables de entorno

Ver `.env.example`. Las `NEXT_PUBLIC_*` viajan al browser (OK). `SUPABASE_SERVICE_ROLE_KEY` y `APP_BASIC_AUTH_PASSWORD` son server-only.

## Estructura

```
app/                         Next.js App Router
  (app)/                     Rutas autenticadas (con sidebar)
    contactos/               Listado, alta, ficha, edición
components/
  ui/                        Componentes base (Button, Input, Table, …)
  layout/                    Sidebar, topbar
lib/
  supabase/                  Clientes server / browser / admin
  crm/                       Acceso a datos y validaciones por dominio
  database.types.ts          Types autogenerados de Supabase
supabase/migrations/         Migraciones SQL versionadas
docs/                        Notas de diseño
```

## Base de datos

El schema completo está en `supabase/migrations/`. Para aplicarlo desde cero:

```bash
pnpm dlx supabase db push
```

O ejecutar los `.sql` manualmente en orden desde el SQL editor.

Para regenerar tipos TS tras cambios en el schema:

```bash
pnpm dlx supabase gen types typescript --project-id <PROJECT_REF> > lib/database.types.ts
```

## Auth

Versión inicial: BasicAuth por `APP_BASIC_AUTH_PASSWORD` en el middleware. Se puede reemplazar por Supabase Auth (email/password o OAuth) editando `middleware.ts` sin tocar el resto del código.

## Design

Ver `ZLT_CRM_Diseno.md` para el modelo conceptual (contacto unificado + touchpoints + pipeline de ingesta).
