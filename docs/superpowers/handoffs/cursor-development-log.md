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
| `/coach/library` | Hub: acceso a Ejercicios + placeholder explícito de Planes (Grupo 3) |
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

- **Grupo 3**: biblioteca de planes + builder + asignación (rutas bajo `/coach/library/plans` o similar).

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
