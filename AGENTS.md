<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# LoBoost — Contexto para agentes (Claude Code / Cursor)

## Cómo retomar el trabajo

1. Leer `docs/superpowers/handoffs/cursor-development-log.md` — registro vivo de qué hizo cada agente.
2. `git log -10 --oneline` — ver commits recientes.
3. Si hay un plan activo en `docs/superpowers/plans/`, ver qué checkboxes están pendientes.
4. Seguir `CLAUDE.md` para convenciones de código.

## Stack

- Next.js 16 App Router — `params` es `Promise<{...}>`, siempre `await params`.
- TypeScript estricto, Supabase (auth + DB), Zod (validación), framer-motion (animaciones).
- Inline styles (no Tailwind) en toda la UI nueva — ver componentes coach como referencia.
- Server Components por defecto. `'use client'` solo cuando hay estado/interactividad.

## Estructura de rutas

```
src/app/
  (coach)/coach/     → rutas del coach (dashboard, clients, library, settings)
  (client)/client/   → rutas del cliente (dashboard, training, history)
  (auth)/            → login, register
```

## Dominio — distinción crítica

- `plans` + `plan_days` + `plan_day_exercises` = **template** del coach (nunca se edita desde flujo cliente)
- `client_plans` + `client_plan_days` + `client_plan_day_exercises` = **copia** asignada al cliente
- `sessions` + `session_sets` = registro de entrenamiento del cliente
- `assignPlan()` siempre crea una copia completa, nunca una referencia al template.

## Design system (inline styles)

```
Background:  #0A0A0A (app), #111317 (cards)
Border:      #1F2227
Text:        #F0F0F0 (primary), #6B7280 (muted), #9CA3AF (secondary)
Accent:      #B5F23D (lima/primary action)
Warning:     #F2994A
Error:       #F25252
Border-r:    14px (cards grandes), 12px (chips), 9999px (pills/badges)
```

## Convenciones de código

- Archivos: kebab-case. Componentes: PascalCase.
- Schemas Zod en `features/[feature]/schemas.ts`.
- Tipos de dominio en `features/[feature]/types.ts`.
- DB types en `src/types/database.ts` — solo regenerar con Supabase CLI, nunca editar a mano.
- Server Actions: `(prevState, formData)` si se usa con `useActionState`. String directo si se llama con `useTransition`.
- `createClient()` de `@/lib/supabase/server` en Server Components y actions. Nunca en `'use client'`.

## Estado del proyecto al 2026-04-10

**Coach (completo):** dashboard, clientes (lista/alta/perfil), ejercicios (CRUD), planes (builder/detalle/editar/asignar/borrar), ajustes, auth.

**Cliente (pendiente):** layout placeholder existe en `(client)/client/dashboard`. Training actions ya implementados (`src/features/training/actions/`). Falta toda la UI: home con plan activo, entrenamiento en vivo, historial.

**Próximo paso:** implementar lado cliente — home, live training, historial. Ver plan en `docs/superpowers/plans/` una vez que se cree.
