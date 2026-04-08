# LoBoost — CLAUDE.md

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Supabase (auth + base de datos)
- Zod para validación, Server Actions para mutaciones

## Estructura
- Todo el código en `src/`
- Feature-based: `src/features/[feature]/`
- Primitivos UI en `src/components/ui/`
- Helpers sin UI en `src/lib/`

## Convenciones críticas
- Archivos: kebab-case (`create-plan.ts`, `plan-editor.tsx`)
- Componentes: PascalCase (`PlanEditor`)
- Server Components por defecto. `'use client'` solo cuando sea necesario.
- `createBrowserClient` → solo en componentes con `'use client'`
- `createServerClient` → Server Components, server actions, middleware
- Schemas Zod en `features/[feature]/schemas.ts`, no dentro de actions.
- Tipos de dominio en `features/[feature]/types.ts`
- Tipos de DB en `src/types/database.ts` — generados, no editados a mano.

## Planes: distinción obligatoria
- `Plan` = template del coach (tabla `plans`)
- `ClientPlan` = copia asignada al cliente (tabla `client_plans`)
- `assignPlan()` siempre crea una copia, nunca una referencia.

## Supabase
- Regenerar tipos: `npx supabase gen types typescript --local > src/types/database.ts`
- Migraciones: `supabase/migrations/` — nunca cambiar schema solo desde el dashboard.

## Design system
- Tokens en `docs/design/DESIGN.md`
- Referencias de Stitch en `docs/design/stitch/` — solo como referencia visual
- Nunca copiar código de Stitch a `features/` directamente
- Prompts de Stitch los genera Claude Code, no el usuario manualmente

## Auth
- Coaches se registran en `/register`
- Clientes los crea el coach desde su dashboard (no se auto-registran)
