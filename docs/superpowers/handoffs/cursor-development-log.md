# Cursor agent — development log (handoff for Claude Code)

Este documento es el **registro vivo** del trabajo hecho con el agente de Cursor cuando Claude Code no está disponible. Cada vez que avancemos aquí, agregamos una entrada nueva al final (o una sección con fecha).

**Para Claude al retomar:** leer este archivo completo, luego `git log` / diff desde el último checkpoint acordado, y actualizar el plan en `docs/superpowers/plans/` si el alcance cambió.

---

## Cómo usar este log

1. Tras cada bloque de trabajo en Cursor: añadir entrada con **qué**, **por qué**, **archivos**, **cómo verificar**, **riesgos / deuda**.
2. Mantener comandos de verificación **copiables** (PowerShell en Windows).
3. No pegar secretos (`.env`, keys).

---

## 2026-04-10 — Pantalla `/coach/clients/[id]` (perfil del cliente)

### Qué se hizo

- Implementación completa de la pantalla de **perfil del cliente** para el coach según el plan `docs/superpowers/plans/2026-04-10-client-profile.md` (tasks 2–7; task 1 ya estaba en el repo).
- La lista de clientes en el dashboard ya enlaza a `/coach/clients/{id}`; esta ruta ahora tiene `page.tsx` y componentes asociados.

### Archivos añadidos (App Router)

Ruta: `src/app/(coach)/coach/clients/[id]/`

| Archivo | Rol |
|--------|-----|
| `page.tsx` | Server Component: auth, `getClientProfileData`, `notFound`, layout de la pantalla |
| `queries.ts` | `getClientProfileData`, `getWeekTrainingData` (Supabase) |
| `actions.ts` | `'use server'`: wrapper de semana + `saveCoachNoteAction` |
| `client-profile-header.tsx` | Header con back, avatar, objetivo, badge de estado |
| `kpi-strip.tsx` | Tres KPIs (cumplimiento, última sesión, total sesiones) |
| `training-week.tsx` | Client: navegador semanal + strip de días + detalle (framer-motion) |
| `plan-card.tsx` | Plan activo, barra de progreso, fechas |
| `physical-profile.tsx` | Grid de datos físicos + lesiones |
| `coach-notes.tsx` | Client: ver/editar nota interna |

### Cómo verlo en localhost

1. `npm run dev` (desde la raíz del repo).
2. Iniciar sesión como **coach** (`/login`).
3. Ir a **Clientes** (`/coach/clients`) y hacer clic en un cliente, o abrir directamente  
   `http://localhost:3000/coach/clients/<uuid-del-cliente>`.

**Notas:**

- Si el cliente no pertenece al coach autenticado, la página responde **404** (`notFound`).
- Sin plan activo, la sección “Entrenamiento” muestra estado vacío coherente con el plan.

### Verificación ejecutada (Cursor)

```powershell
cd "C:\Users\herna\Loboost App"
npx tsc --noEmit
npx jest --no-coverage
```

Resultado al momento de la implementación: **TypeScript OK**, **78 tests OK** (13 suites).

### Decisiones / diferencias a tener en cuenta

- **Notas del coach:** ya existía `src/features/coach/actions/save-coach-note.ts` (FormData + Zod). En esta pantalla se usa `saveCoachNoteAction` en `clients/[id]/actions.ts` (string + upsert por última nota). Conviene que Claude **unifique** en una sola API si se quiere una sola convención de validación.
- Algunos textos de UI se dejaron en **ASCII** (sin tildes) en archivos nuevos para evitar problemas de encoding en entornos restrictivos; se puede normalizar a español con tildes en un pase de pulido.
- **Seguridad:** `getClientProfileData` exige `profiles.coach_id === coachId` antes de devolver datos.

### Git / checkpoints

- Checkpoint previo (solo docs/planes + ajustes varios): commit `611cfb0` — `chore: checkpoint Claude progress before handoff`.
- El código de esta pantalla estaba **sin commitear** hasta el siguiente commit que agregue este log + `src/app/(coach)/coach/clients/[id]/`.

### Próximos pasos sugeridos (para Claude o Cursor)

- Pulido de copy (tildes, consistencia con el resto de la app).
- Unificar acción de guardado de notas (Zod + una sola firma).
- Smoke manual en datos reales: semanas, sesiones `in_progress`, sets, RLS.
- Opcional: tests de integración o contract tests sobre shapes de Supabase si hay fricción de tipos en selects anidados.

---

## 2026-04-10 — Grupo 2 (MVP): Librería de ejercicios (`/coach/library`)

### Qué se hizo

- Se implementó el **hub de Librería** en la ruta que ya usa el `BottomNav`: `/coach/library`.
- Se implementó **listado de ejercicios** + **crear ejercicio** + **eliminar ejercicio** (con confirmación).
- Se alineó `createExerciseAction` con el patrón del repo (**React 19 `useActionState`**: firma `(prevState, formData)`).
- Se endureció `deleteExerciseAction` para exigir auth y filtrar por `coach_id` (defensa en profundidad además de RLS).

### Rutas nuevas

| Ruta | Descripción |
|------|-------------|
| `/coach/library` | Hub: acceso a Ejercicios y Planes |
| `/coach/library/exercises` | Lista ejercicios del coach (orden por nombre) |
| `/coach/library/exercises/new` | Formulario crear ejercicio |

### Archivos tocados / añadidos

- `src/app/(coach)/coach/library/page.tsx`
- `src/app/(coach)/coach/library/exercises/page.tsx`
- `src/app/(coach)/coach/library/exercises/queries.ts`
- `src/app/(coach)/coach/library/exercises/exercise-list.tsx` (`'use client'`)
- `src/app/(coach)/coach/library/exercises/new/page.tsx`
- `src/app/(coach)/coach/library/exercises/new/create-exercise-form.tsx` (`'use client'`)
- `src/features/exercises/actions/create-exercise.ts` (breaking change interno: ahora es `useActionState`-compatible)
- `src/features/exercises/actions/update-exercise.ts` (video URL vacío → no valida URL)
- `src/features/exercises/actions/delete-exercise.ts` (auth + `eq('coach_id', user.id)`)

### Cómo verlo en localhost

1. `npm run dev`
2. Login coach
3. Tap **Librería** en bottom nav → `/coach/library`
4. Entrar a **Ejercicios** → crear con **+** → volver al listado

### Verificación ejecutada (Cursor)

```powershell
cd "C:\Users\herna\Loboost App"
npx tsc --noEmit
npx jest --no-coverage
```

Resultado: **TypeScript OK**, **78 tests OK** (13 suites).

### Git

- Commit: `1c28935` — `feat: add coach exercise library under /coach/library`

### Pulido producto (mismo Grupo 2)

- Copy en español con tildes en hub + formulario (ej. “Librería”, “Categoría”).
- Empty state más “producto” en lista vacía.
- Eliminación sin `alert()` / `confirm()`: **sheet/modal** con error inline si el ejercicio está en uso.
- Cierre UX: tap fuera del sheet / tecla `Esc` (salvo mientras elimina).

Archivos extra:

- `src/app/(coach)/coach/library/exercises/delete-exercise-dialog.tsx`

### Git (pulido)

- Commit: `90b9c4c` — `polish: exercise library UX (Spanish copy, delete sheet, no native dialogs)`

### Deuda / próximo paso natural

- Cubierto en **Grupo 3** (entrada siguiente).

---

## 2026-04-10 — Grupo 3 (MVP): Librería de planes (`/coach/library/plans`)

### Qué se hizo

- **Hub** `/coach/library`: el tile **Planes** enlaza a `/coach/library/plans` (ya no es placeholder).
- **Listado** de plantillas del coach (`plans`) con conteo de días/semana y semanas.
- **Crear plantilla** `/coach/library/plans/new`: builder por días de la semana + ejercicios de la biblioteca; serializa JSON en `FormData` bajo `planPayload` para `createPlanAction` (validación Zod + reglas fuerza/cardio en servidor).
- **Asignar** `/coach/library/plans/[id]/assign`: elige cliente del coach, fecha de inicio; `assignPlanAction` copia a `client_plans` / días / ejercicios; redirección al perfil del cliente.
- **Eliminar** plantilla: sheet (sin `alert`/`confirm`) que llama a `deletePlanAction` (auth + `coach_id`).

### Rutas

| Ruta | Descripción |
|------|-------------|
| `/coach/library/plans` | Lista plantillas + FAB a crear |
| `/coach/library/plans/new` | Builder nueva plantilla |
| `/coach/library/plans/[id]/assign` | Asignar a cliente |

### Archivos (App Router y UI)

- `src/app/(coach)/coach/library/page.tsx` (enlace Planes)
- `src/app/(coach)/coach/library/plans/page.tsx`
- `src/app/(coach)/coach/library/plans/queries.ts`
- `src/app/(coach)/coach/library/plans/plan-list.tsx`
- `src/app/(coach)/coach/library/plans/delete-plan-dialog.tsx`
- `src/app/(coach)/coach/library/plans/new/page.tsx`
- `src/app/(coach)/coach/library/plans/new/create-plan-form.tsx`
- `src/app/(coach)/coach/library/plans/[id]/assign/page.tsx`
- `src/app/(coach)/coach/library/plans/[id]/assign/assign-plan-form.tsx`

**Servidor (features, ya endurecido en la misma línea de trabajo):**

- `src/features/plans/schemas.ts` (`planBuilderPayloadSchema`, etc.)
- `src/features/plans/actions/create-plan.ts`, `assign-plan.ts`, `update-plan.ts`, `delete-plan.ts`
- Tests: `src/features/plans/__tests__/schemas.test.ts`

### Cómo verlo en localhost

1. `npm run dev`
2. Login coach → **Librería** → **Planes**
3. Crear plantilla (necesitás al menos un ejercicio en **Ejercicios**)
4. Desde la lista, flecha → **Asignar** → cliente + fecha → enviar → debe abrir `/coach/clients/[id]`

### Verificación ejecutada (Cursor)

```powershell
cd "C:\Users\herna\Loboost App"
npx tsc --noEmit
npx jest --no-coverage
```

Resultado: **TypeScript OK**, **80 tests OK** (13 suites).

### Git

- Mensaje: `feat: coach plan library, builder, and assign flow` (UI + `src/features/plans`).
- Ubicar en el historial: `git log --oneline --grep "coach plan library" -n 1`

### Deuda / mejoras posteriores (parcialmente cubierto en entradas siguientes)

- Edición de plan en UI, `CustomSelect` unificado, detalle de plan y rollback de assign: ver **sesión Cursor** más abajo.

---

## 2026-04-10 — Cursor: fix Next 16 + pantalla Ajustes coach

### Qué se hizo

- **Build Next.js 16 / Turbopack:** en `'use server'`, cualquier `export function` no async se interpreta como Server Action. `calculateEndDate` en `assign-plan.ts` rompía el build. Se extrajo a `src/features/plans/calculate-end-date.ts` (sin `'use server'`). Tests: import actualizado.
- **Ajustes:** `/coach/settings` — perfil (nombre con server action), email solo lectura, cerrar sesión.

### Git

- `1174f2a` — fix calculateEndDate  
- `afb25b4` — feat coach settings

---

## 2026-04-10 — Cursor: polish funcional/UX coach (pre–lado cliente)

### Qué se hizo

- **Global:** scrollbars ocultos (`globals.css`); bottom nav etiqueta **Biblioteca**.
- **Componente:** `src/components/ui/coach-subpage-header.tsx` (volver + título centrado + subtítulo + slot derecho).
- **Biblioteca hub:** tarjetas con chevron, títulos lima, hover; copy sin “plantilla” donde correspondía.
- **Ejercicios:** cabecera unificada; tarjetas con nombre lima, borrar rojo, **editar** → `/coach/library/exercises/[id]/edit`; `updateExerciseAction` con `useActionState`, `coach_id`, `revalidatePath`.
- **Planes:** misma cabecera; lista con enlace a **detalle**; nombre lima; borrar rojo.
- **Detalle plan:** `/coach/library/plans/[id]` — acciones **Editar plan** y **Asignar a cliente**.
- **Editar plan (estructura completa):** `/coach/library/plans/[id]/edit` — `plan-builder-form.tsx` modo edit, `update-plan-full.ts`, lógica compartida `plan-builder-persist.ts`, `submit-plan-builder.ts` para un solo `useActionState` en create/edit.
- **Plan builder UX:** un solo día editable a la vez (flechas + puntos); tarjetas **Ejercicio 1…N** con separación clara; **Agregar ejercicio** a ancho completo **al final** de la lista del día.
- **Asignar:** vuelta atrás al detalle del plan; `CoachSubpageHeader`.
- **CustomSelect:** modo **controlado** (`value` + `onChange`, `name` opcional) además del modo formulario; mismo patrón visual que crear cliente — usado en movimiento del plan, cliente al asignar, tipo al editar ejercicio. Lista con `max-height` + scroll.
- **Ajustes (iteración):** “Editar nombre” / Guardar solo si hay cambios; títulos de sección lima; cerrar sesión con contenedor rojo.

### Rutas coach (resumen ampliado)

| Ruta | Descripción |
|------|-------------|
| `/coach/settings` | Ajustes |
| `/coach/library/plans/[id]` | Detalle del plan |
| `/coach/library/plans/[id]/edit` | Editar plan (metadata + días/ejercicios) |
| `/coach/library/exercises/[id]/edit` | Editar ejercicio |

### Archivos nuevos o clave (esta iteración)

- `src/features/plans/plan-builder-persist.ts`, `actions/update-plan-full.ts`, `actions/submit-plan-builder.ts`
- `src/app/(coach)/coach/library/plans/plan-builder-form.tsx` (reemplaza `new/create-plan-form.tsx`)
- `src/features/plans/calculate-end-date.ts`
- Varios bajo `coach/library/...`, `components/ui/coach-subpage-header.tsx`, `custom-select.tsx` ampliado

### Verificación (Cursor)

```powershell
cd "C:\Users\herna\Loboost App"
npx tsc --noEmit
npx jest --no-coverage
```

**TypeScript OK**, **80 tests** (13 suites), última corrida en esta línea de trabajo.

### Git (orden sugerido para revisar)

`028e273` CustomSelect unificado · `fd7d001` plan builder ejercicios · `50fee34` polish coach UX · `afb25b4` settings · `1174f2a` Next 16 assign · `163e993` plan library inicial (+ commits anteriores de perfil cliente y ejercicios en este log)

---

## Estado al handoff (2026-04-10) — Coach vs siguiente paso (para Claude)

### Lado coach (MVP funcional base)

Cubre el flujo principal: **dashboard**, **clientes** (lista, alta, perfil), **biblioteca** (ejercicios crear/editar/borrar; planes crear/editar estructura, detalle, asignar, borrar), **ajustes**, **auth**. El usuario seguirá con **pulido visual pantalla por pantalla** aparte; no bloquea Fase 2 cliente.

### Pendiente funcional coach (no bloquea arrancar el cliente)

- Editar la **copia** `client_plans` asignada al cliente desde UI (ajustes sin tocar el template `plans`).
- Estados explícitos del plan del cliente (pausar / completar) más allá del reemplazo al asignar otro.
- Búsqueda / orden en lista de clientes; header buscar/campana (hoy decorativo o vacío).
- Unificar API de **notas del coach** (`save-coach-note` vs wrapper en `clients/[id]/actions.ts`).
- **Rollback** o transacción en `assignPlanAction` si la copia falla a mitad.

### Prioridad recomendada para Claude Code

1. **Lado cliente** según `docs/superpowers/specs/2026-04-09-fase2-design.md`: plan activo, semanas/días, **sesión** (`sessions` + `session_sets`), historial mínimo. Sin esto el dashboard del coach no refleja adherencia real.
2. Revisar `CLAUDE.md` / `AGENTS.md`; el proyecto puede estar en **Next 16.x** en el entorno local — leer guía en `node_modules/next/dist/docs/` si hay APIs nuevas o deprecadas.

### Cómo retomó Claude (mecanismo acordado)

1. Leer **este archivo completo** (`docs/superpowers/handoffs/cursor-development-log.md`).
2. `git pull` / `git log -20 --oneline` y diff frente a la expectativa del usuario.
3. Alinear con spec Fase 2 y planes en `docs/superpowers/plans/` si el alcance cambió.
4. Seguir convenciones del repo (Zod en `schemas`, Server Actions, `Plan` vs `ClientPlan`, migraciones Supabase).

---

## Plantilla para próximas entradas

```markdown
## YYYY-MM-DD — Título corto

### Qué se hizo
- ...

### Archivos
- ...

### Cómo verificar
- ...

### Riesgos / deuda
- ...
```
