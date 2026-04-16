<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# LoBoost — Onboarding para agentes

Este archivo es onboarding humano + resumen operativo.  
Las reglas ejecutables del agente viven en:

- `.cursor/rules/*.mdc` (fuente de verdad runtime)
- `.cursor/skills/*/SKILL.md` (playbooks por responsabilidad)
- `docs/decisions/*.md` (decisiones arquitectónicas/IA persistentes)

## Cómo retomar trabajo en minutos

1. Leer `docs/superpowers/handoffs/cursor-development-log.md`.
2. Revisar `git log -10 --oneline`.
3. Si aplica, abrir plan activo en `docs/superpowers/plans/`.
4. Validar decisiones vigentes en `docs/decisions/`.

## Contexto técnico rápido

- Stack principal: Next.js App Router + TypeScript + Supabase + Zod.
- Server Components por defecto; `'use client'` solo con interactividad real.
- Rutas por dominio en `src/app/(coach)`, `src/app/(client)`, `src/app/(training)`, `src/app/(auth)`.
- Lógica de negocio en `src/features/*`; infraestructura compartida en `src/lib/*`.

## Invariantes de dominio (obligatorio)

- `plans` son templates del coach.
- `client_plans` son copias asignadas a clientes.
- `assignPlan()` crea copia completa; nunca referencia mutable al template.

## Convenciones clave

- Archivos: kebab-case. Componentes: PascalCase.
- Schemas Zod: `src/features/<feature>/schemas.ts`.
- Tipos de dominio: `src/features/<feature>/types.ts`.
- Tipos DB: `src/types/database.ts` generado, no editable a mano.
- Server-side Supabase desde `@/lib/supabase/server`.

## UI y producto

Seguir tokens y principios en `docs/design/DESIGN.md` (dark + lime, mobile-first, claridad por encima de ornamentación).
