# LoBoost — Claude Code Context

Este archivo es la fuente de verdad operativa para sesiones de Claude Code.
Las reglas detalladas viven en `.cursor/rules/*.mdc` (Cursor) y `.cursor/skills/*/SKILL.md` (ambos).

---

## Stack

- **Framework:** Next.js 15 App Router + TypeScript
- **DB / Auth:** Supabase (Postgres + RLS + Auth)
- **Validación:** Zod
- **UI:** Tailwind CSS v4 + shadcn/ui + tokens propios en `src/app/globals.css`
- **Target:** PWA mobile-first → 390px (iPhone 14); desktop es secondary

## Rutas por dominio

```
src/app/(coach)/     → flujos del coach
src/app/(client)/    → flujos del cliente (nav estándar)
src/app/(training)/  → sesión de entrenamiento (nav inmersivo)
src/app/(auth)/      → login, register
```

Lógica de negocio en `src/features/<feature>/`. Infraestructura compartida en `src/lib/`.

## Invariantes de dominio (nunca violar)

- `plans` son templates del coach. `client_plans` son copias asignadas. Nunca referencias mutables.
- La cadena de aislamiento coach→cliente: `profiles.coach_id = auth.uid()` es la raíz de toda query del coach.
- RLS está habilitado en todas las tablas. Siempre incluir filtros `.eq()` explícitos aunque RLS exista.

## Convenciones clave

- Archivos: kebab-case. Componentes: PascalCase.
- `src/types/database.ts` — generado automáticamente, nunca editar a mano.
- Server-side Supabase: `@/lib/supabase/server`. Client-side: `@/lib/supabase/client`.
- Schemas Zod: `src/features/<feature>/schemas.ts`. Tipos de dominio: `src/features/<feature>/types.ts`.
- Server Components por defecto. `'use client'` solo cuando hay interactividad real (eventos, hooks).

---

## Workflow

```
Simple (1-2 archivos, sin DB/auth)  →  implementar directamente
Medio  (lógica de negocio, multi-archivo)  →  grill-me → implementar
Complejo (DB, auth, nuevos flujos)  →  grill-me → slice → skills → done
```

En caso de duda: hacer grill-me. El costo de grill-me innecesario es 5 minutos.

## Skills (invocar con la herramienta Skill)

| Skill | Cuándo |
|-------|--------|
| `grill-me` | Antes de cualquier feature no trivial — alineación primero |
| `slice` | Cuando grill-me termina con "Próximo paso: slice" |
| `backend` | Antes de escribir queries, actions, o RPCs |
| `frontend` | Antes de crear componentes, páginas, o secciones de UI |
| `done` | Siempre antes de declarar listo — corre Layer 1 estático |
| `qa` | Manual — para validar golden paths con Playwright |

---

## Seguridad (reglas no negociables)

- **SECURITY DEFINER prohibido por defecto.** Si es necesario: escalation explícita + `SET search_path = ''` + `auth.uid()` check en WHERE.
- **Service role (`SUPABASE_SERVICE_ROLE_KEY`) prohibido en feature code.** Solo con escalation explícita.
- **Toda query nueva requiere declarar la isolation chain** antes de escribir código: caller → tabla raíz → cómo llega a `auth.uid()`.
- **Nunca `.select('*')`** sin justificación inline.

## UI (reglas no negociables)

- Colores solo con tokens de `globals.css` (`var(--color-*)` o clases Tailwind mapeadas). Nunca hex hardcodeado.
- Estilos solo con Tailwind. `style={{}}` solo para valores dinámicos de JS — con comentario justificando por qué Tailwind no alcanza.
- Espaciado en grid de 4px: valores Tailwind `1/2/3/4/5/6/8/12/16`. Nunca valores arbitrarios fuera del grid.
- Touch targets mínimo 44px en todo elemento interactivo.
- Safe-area inset obligatorio en todos los layouts fijos (header, bottom nav). Usar `@/lib/ui/safe-area`.

## Gates de escalation (parar y confirmar antes de continuar)

- Cambio de schema DB (nueva tabla, columna, índice, política RLS)
- Lógica de auth o permisos
- Nueva relación entre entidades de dominio
- Cualquier operación destructiva o irreversible

---

## Contexto adicional

- `docs/design/DESIGN.md` — design system completo (paleta, tipografía, spacing, componentes)
- `docs/decisions/` — decisiones arquitectónicas persistentes
- `supabase/migrations/` — fuente de verdad del schema
- `AGENTS.md` — onboarding rápido para retomar trabajo
