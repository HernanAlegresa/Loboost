# Exercise Progress UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar las 3 pantallas del flujo Coach → Progreso del Cliente: ajustes de spacing/tipografía en Check-ins, simplificación de tarjetas de ejercicios, y reestructurar la pantalla de detalle de ejercicio para mostrar todas las semanas del plan (no solo semanas con datos).

**Architecture:** Cambios UI puros en Tasks 1-2. Task 3 reescribe `getExerciseWeeklyHistory` para construir semanas desde la estructura del plan (plan-first) en lugar de desde sesiones completadas, usando `computeDayDate`. Tasks 4-5 actualizan la UI del grid y agregan refresh-on-focus como client component mínimo.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (server client), React (server + client components), inline styles.

---

## File Map

| File | Action | Responsabilidad |
|------|--------|-----------------|
| `src/app/(coach)/coach/clients/[id]/check-ins/page.tsx` | Modify | UI: font-size y padding del nombre del plan |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx` | Modify | UI: quitar peso de ExerciseCard |
| `src/app/(coach)/coach/clients/[id]/progress-queries.ts` | Modify | Lógica: reescribir `getExerciseWeeklyHistory` para plan-first |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/exercise-week-grid.tsx` | Modify | UI: manejar días vacíos, navegación sobre todas las semanas |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/refresh-on-focus.tsx` | Create | Client component: router.refresh() on visibilitychange |
| `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/page.tsx` | Modify | Montar RefreshOnFocus; ajustar estado vacío |

---

### Task 1: Check-ins — Ajuste de jerarquía visual del nombre del plan

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/check-ins/page.tsx`

El nombre del plan está en `padding: '20px 20px 8px'` con `fontSize: 15`. Necesita más presencia visual y mayor separación de las pills.

- [ ] **Step 1: Aplicar cambios de estilo en el `<p>` del nombre del plan**

En `check-ins/page.tsx`, línea ~139, cambiar:
```tsx
<p
  style={{
    fontSize: 15,
    fontWeight: 700,
    color: '#B5F23D',
    textAlign: 'center',
    margin: 0,
    padding: '20px 20px 8px',
  }}
>
  {activePlan.name}
</p>
```
Por:
```tsx
<p
  style={{
    fontSize: 18,
    fontWeight: 700,
    color: '#B5F23D',
    textAlign: 'center',
    margin: 0,
    padding: '28px 20px 20px',
  }}
>
  {activePlan.name}
</p>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/check-ins/page.tsx
git commit -m "feat(check-ins): increase plan name prominence and spacing"
```

---

### Task 2: Exercise List — Quitar peso de las tarjetas

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx`

La tarjeta actualmente muestra `{ex.lastTopSetKg} kg` a la derecha. Eliminar ese bloque; mantener nombre, subtítulo de sesiones, flecha de tendencia y ChevronRight.

- [ ] **Step 1: Eliminar el bloque de peso en ExerciseCard**

En `exercises-progress-list.tsx`, dentro de `ExerciseCard`, localizar y eliminar este bloque (líneas ~121-125):
```tsx
{!bw && ex.lastTopSetKg !== null ? (
  <p style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1 }}>
    {ex.lastTopSetKg} kg
  </p>
) : null}
```

La variable `bw` queda sin usar. Eliminarla también:
```tsx
// Eliminar esta línea:
const bw = ex.peakTopSetKg === null
```

El `<div>` contenedor de peso/trend queda con solo la flecha de tendencia. Si solo queda `trendConfig`, simplificar el contenedor:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
  {trendConfig && (
    <span style={{ fontSize: 12, fontWeight: 700, color: trendConfig.color, lineHeight: 1 }}>
      {trendConfig.arrow}
    </span>
  )}
</div>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/exercises-progress/exercises-progress-list.tsx
git commit -m "feat(exercises-list): remove weight from exercise cards for cleaner UI"
```

---

### Task 3: `getExerciseWeeklyHistory` — Reescritura plan-first

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/progress-queries.ts`

**Problema:** La función construye `weeks` solo cuando hay sets completados. Semanas con el ejercicio asignado pero sin sesión son invisibles.

**Fix:** Construir semanas desde la estructura del plan (PDEs + `day_of_week`), superponiendo sets reales donde existan.

- [ ] **Step 1: Agregar `computeDayDate` al import de training-utils**

En `progress-queries.ts`, línea 2, cambiar:
```ts
import { getCurrentWeek } from '@/features/clients/utils/training-utils'
```
Por:
```ts
import { getCurrentWeek, computeDayDate } from '@/features/clients/utils/training-utils'
```

- [ ] **Step 2: Reemplazar el cuerpo de `getExerciseWeeklyHistory`**

Reemplazar toda la función `getExerciseWeeklyHistory` (desde la línea `export async function getExerciseWeeklyHistory` hasta su cierre `}`) con la siguiente implementación:

```ts
export async function getExerciseWeeklyHistory(
  clientId: string,
  exerciseId: string,
  activePlan: ActivePlanSummary
): Promise<ExerciseWeeklyHistory | null> {
  const supabase = await createClient()

  const { data: exerciseInfo } = await supabase
    .from('exercises')
    .select('id, name, muscle_group')
    .eq('id', exerciseId)
    .single()

  if (!exerciseInfo) return null

  const empty: ExerciseWeeklyHistory = {
    exerciseId,
    exerciseName: exerciseInfo.name,
    muscleGroup: exerciseInfo.muscle_group,
    peakTopSetKg: null,
    isBodyweight: true,
    currentPlanWeek: activePlan.currentWeek,
    weeks: [],
  }

  // Fetch plan days with day_of_week up to currentWeek
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week')
    .eq('client_plan_id', activePlan.id)
    .lte('week_number', activePlan.currentWeek)

  if (!planDays || planDays.length === 0) return empty

  const planDayIds = planDays.map((d) => d.id)

  // Find which plan days have this exercise assigned
  const { data: pdes } = await supabase
    .from('client_plan_day_exercises')
    .select('id, client_plan_day_id')
    .in('client_plan_day_id', planDayIds)
    .eq('exercise_id', exerciseId)

  if (!pdes || pdes.length === 0) return empty

  const pdeIds = pdes.map((p) => p.id)
  const assignedPlanDayIds = new Set(pdes.map((p) => p.client_plan_day_id))

  // Build plan structure: weekNumber → sorted day_of_week[]
  const weekByDayId = new Map(planDays.map((d) => [d.id, d.week_number]))
  const dowByDayId = new Map(planDays.map((d) => [d.id, d.day_of_week]))
  const weekDowMap = new Map<number, number[]>()
  for (const pd of planDays) {
    if (!assignedPlanDayIds.has(pd.id)) continue
    if (!weekDowMap.has(pd.week_number)) weekDowMap.set(pd.week_number, [])
    weekDowMap.get(pd.week_number)!.push(pd.day_of_week)
  }

  // Fetch completed sessions for plan days that have this exercise
  const assignedPlanDayIdArr = planDays
    .filter((pd) => assignedPlanDayIds.has(pd.id))
    .map((pd) => pd.id)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, date')
    .eq('client_id', clientId)
    .in('client_plan_day_id', assignedPlanDayIdArr)
    .eq('status', 'completed')

  const sessionList = sessions ?? []
  const sessionIds = sessionList.map((s) => s.id)
  const dateBySessionId = new Map(sessionList.map((s) => [s.id, s.date]))
  const planDayBySessionId = new Map(sessionList.map((s) => [s.id, s.client_plan_day_id]))

  // Fetch sets only if there are sessions
  let sets: Array<{
    session_id: string
    client_plan_day_exercise_id: string
    weight_kg: number | null
    set_number: number
  }> = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select('session_id, client_plan_day_exercise_id, weight_kg, set_number')
      .in('session_id', sessionIds)
      .in('client_plan_day_exercise_id', pdeIds)
      .eq('completed', true)
      .order('set_number', { ascending: true })
    sets = data ?? []
  }

  // Aggregate sets: weekNumber → date → setNumber → weightKg
  const weekSetMap = new Map<number, Map<string, Map<number, number | null>>>()
  let peakTopSetKg: number | null = null

  for (const set of sets) {
    const date = dateBySessionId.get(set.session_id)
    const planDayId = planDayBySessionId.get(set.session_id)
    if (!date || !planDayId) continue
    const weekNumber = weekByDayId.get(planDayId) ?? 0
    if (weekNumber === 0) continue

    if (!weekSetMap.has(weekNumber)) weekSetMap.set(weekNumber, new Map())
    const dayMap = weekSetMap.get(weekNumber)!
    if (!dayMap.has(date)) dayMap.set(date, new Map())
    const setMap = dayMap.get(date)!

    const kg = set.weight_kg != null ? Number(set.weight_kg) : null
    if (!setMap.has(set.set_number)) setMap.set(set.set_number, kg)
    if (kg !== null && (peakTopSetKg === null || kg > peakTopSetKg)) peakTopSetKg = kg
  }

  // Build weeks from plan structure (plan-first, 1 → currentPlanWeek)
  const weeks: ExerciseWeekGrid[] = []

  for (let w = 1; w <= activePlan.currentWeek; w++) {
    const assignedDows = weekDowMap.get(w)
    if (!assignedDows || assignedDows.length === 0) continue

    const daySetMapForWeek = weekSetMap.get(w)

    const days: ExerciseDayData[] = [...assignedDows].sort((a, b) => a - b).map((dow) => {
      const date = computeDayDate(activePlan.startDate, w, dow)
      const setsForDay: ExerciseSetDetail[] = []

      const setMap = daySetMapForWeek?.get(date)
      if (setMap && setMap.size > 0) {
        const maxSetNum = Math.max(...setMap.keys())
        for (let i = 1; i <= maxSetNum; i++) {
          setsForDay.push({ setNumber: i, weightKg: setMap.get(i) ?? null })
        }
      }

      return { date, dayLabel: formatDayLabel(date), sets: setsForDay }
    })

    const maxSets = days.reduce((m, d) => Math.max(m, d.sets.length), 0)
    weeks.push({ weekNumber: w, days, maxSets })
  }

  return {
    exerciseId,
    exerciseName: exerciseInfo.name,
    muscleGroup: exerciseInfo.muscle_group,
    peakTopSetKg,
    isBodyweight: peakTopSetKg === null,
    currentPlanWeek: activePlan.currentWeek,
    weeks,
  }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores. Si hay un error en `dowByDayId` por ser declarada pero no usada, eliminar esa línea (es redundante — la lógica usa `weekDowMap` directamente).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/progress-queries.ts
git commit -m "feat(exercise-detail): rewrite getExerciseWeeklyHistory to show all plan weeks"
```

---

### Task 4: ExerciseWeekGrid — Manejar días sin sesión

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/exercise-week-grid.tsx`

Con el nuevo `getExerciseWeeklyHistory`, `weeks` puede contener semanas donde `maxSets === 0` (ningún día tiene sesión aún) o semanas donde algún día tiene `sets.length === 0`. El grid debe renderizarlo limpiamente.

- [ ] **Step 1: Ajustar el header para manejar `maxSets === 0`**

En `exercise-week-grid.tsx`, dentro del `<thead>`, la generación de columnas actualmente es:
```tsx
{Array.from({ length: week.maxSets }, (_, i) => (
  <th key={i + 1} ...>S{i + 1}</th>
))}
```

Reemplazar con:
```tsx
{week.maxSets === 0 ? (
  <th
    style={{
      padding: '12px 10px 10px',
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 600,
      color: '#4B5563',
      borderBottom: '1px solid #1A1E24',
    }}
  >
    —
  </th>
) : (
  Array.from({ length: week.maxSets }, (_, i) => (
    <th
      key={i + 1}
      style={{
        padding: '12px 10px 10px',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 600,
        color: '#9CA3AF',
        borderBottom: '1px solid #1A1E24',
        whiteSpace: 'nowrap',
      }}
    >
      S{i + 1}
    </th>
  ))
)}
```

- [ ] **Step 2: Ajustar las celdas de datos para días sin sets**

Dentro del `<tbody>`, la celda de datos actualmente es:
```tsx
{Array.from({ length: week.maxSets }, (_, i) => {
  ...
})}
```

Reemplazar con:
```tsx
{day.sets.length === 0 ? (
  <td
    key="empty"
    colSpan={Math.max(1, week.maxSets)}
    style={{
      padding: '11px 10px',
      textAlign: 'center',
      fontSize: 15,
      fontWeight: 400,
      color: '#2D3340',
      borderTop: rowIdx > 0 ? '1px solid #1A1E24' : undefined,
    }}
  >
    —
  </td>
) : (
  Array.from({ length: week.maxSets }, (_, i) => {
    const set = day.sets[i]
    const kg = set?.weightKg ?? null
    const hasValue = kg !== null
    return (
      <td
        key={i}
        style={{
          padding: '11px 10px',
          textAlign: 'center',
          fontSize: 15,
          fontWeight: hasValue ? 600 : 400,
          color: hasValue ? '#B5F23D' : '#2D3340',
          borderTop: rowIdx > 0 ? '1px solid #1A1E24' : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {isBodyweight ? 'PC' : hasValue ? `${kg} kg` : '—'}
      </td>
    )
  })
)}
```

- [ ] **Step 3: Actualizar el `minWidth` del table para `maxSets === 0`**

La propiedad `minWidth` de la tabla es actualmente:
```tsx
minWidth: week.maxSets * 80 + 120,
```

Cambiar a:
```tsx
minWidth: Math.max(1, week.maxSets) * 80 + 120,
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/exercises-progress/\[exerciseId\]/exercise-week-grid.tsx
git commit -m "feat(exercise-grid): handle empty days and zero-set weeks in grid display"
```

---

### Task 5: RefreshOnFocus + ExerciseDetailPage

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/refresh-on-focus.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/exercises-progress/[exerciseId]/page.tsx`

- [ ] **Step 1: Crear `refresh-on-focus.tsx`**

Crear el archivo con este contenido exacto:
```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshOnFocus() {
  const router = useRouter()
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) router.refresh()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])
  return null
}
```

- [ ] **Step 2: Montar RefreshOnFocus en ExerciseDetailPage**

En `exercises-progress/[exerciseId]/page.tsx`, agregar el import:
```tsx
import RefreshOnFocus from './refresh-on-focus'
```

En el JSX del return principal (el `<div>` raíz con `height: '100%'`), agregar `<RefreshOnFocus />` como primer hijo, antes del `<CoachSubpageHeader>`:
```tsx
return (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <RefreshOnFocus />
    <CoachSubpageHeader ... />
    ...
  </div>
)
```

- [ ] **Step 3: Ajustar el estado vacío**

Con el nuevo `getExerciseWeeklyHistory`, `weeks` puede estar vacío solo si el ejercicio no está asignado en ninguna semana pasada/actual. Actualizar el mensaje en `page.tsx`:

Cambiar:
```tsx
<p style={{ fontSize: 14, color: '#4B5563' }}>
  Sin sesiones completadas para este ejercicio.
</p>
```
Por:
```tsx
<p style={{ fontSize: 14, color: '#4B5563' }}>
  Este ejercicio no está asignado en el plan aún.
</p>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/exercises-progress/\[exerciseId\]/refresh-on-focus.tsx
git add src/app/\(coach\)/coach/clients/\[id\]/exercises-progress/\[exerciseId\]/page.tsx
git commit -m "feat(exercise-detail): add refresh-on-focus and update empty state message"
```

---

## Orden de ejecución recomendado

Tasks 1 → 2 → 3 → 4 → 5. Tasks 1 y 2 son completamente independientes entre sí y de las demás. Tasks 3 y 4 están relacionadas (el query cambia lo que el grid recibe). Task 5 depende de que Task 3-4 funcionen.

---

## Verificación final

Después de todos los commits:

```bash
npx tsc --noEmit
```

Verificar visualmente en el navegador:
1. **Check-ins:** el nombre del plan se ve más grande y con más espacio respecto a las pills
2. **Lista de ejercicios:** no aparece el peso en ninguna tarjeta
3. **Detalle de ejercicio:** 
   - Las flechas ←→ navegan entre todas las semanas (1 hasta semana actual)
   - Semanas sin sesión muestran los días asignados con `—`
   - Semanas con sesión muestran los datos reales
   - La semana actual tiene el badge "Actual"
   - Volver a la pestaña después de salir dispara un refresh
