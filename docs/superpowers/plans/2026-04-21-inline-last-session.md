# Inline Last-Session Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el peso y reps de la sesión anterior para cada set mientras el cliente loguea el entrenamiento actual ("Última vez: 80 kg × 5 reps").

**Architecture:** Nueva query `getPrevSessionSets` obtiene los sets completados de las últimas 10 sesiones del cliente, filtra por los ejercicios del entrenamiento actual y construye un Record indexado por `exerciseId:setNumber`. La page pasa este mapa a `LiveTraining` como prop; el componente lo usa para renderizar la referencia histórica en cada set card activo.

**Tech Stack:** Next.js 14 App Router, Supabase JS v2, TypeScript.

---

## Files

- **Modify:** `src/app/(training)/client/training/[sessionId]/queries.ts` — añadir `getPrevSessionSets` + tipo `PrevSetEntry`
- **Modify:** `src/app/(training)/client/training/[sessionId]/page.tsx` — llamar query en paralelo, pasar `prevSets` a `LiveTraining`
- **Modify:** `src/app/(training)/client/training/[sessionId]/live-training.tsx` — añadir `exerciseId` a `FlatSet`, recibir `prevSets` prop, renderizar referencia histórica en el set activo

---

### Task 1: Query `getPrevSessionSets`

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/queries.ts`

- [ ] **Step 1: Añadir tipo y función al final del archivo**

```typescript
// Al final de queries.ts, después de getLiveSessionData

export type PrevSetEntry = {
  weightKg: number | null
  repsPerformed: number | null
}

export async function getPrevSessionSets(
  clientId: string,
  exerciseIds: string[],
  currentSessionId: string
): Promise<Record<string, PrevSetEntry>> {
  if (exerciseIds.length === 0) return {}

  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .neq('id', currentSessionId)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (!sessions?.length) return {}

  const sessionIds = sessions.map((s) => s.id)

  const { data: sets } = await supabase
    .from('session_sets')
    .select(
      'set_number, weight_kg, reps_performed, session_id, client_plan_day_exercises(exercise_id)'
    )
    .in('session_id', sessionIds)
    .eq('completed', true)

  if (!sets?.length) return {}

  // sessions está en orden DESC de completed_at → índice 0 = más reciente
  const sessionRank = new Map(sessions.map((s, i) => [s.id, i]))
  const sorted = [...sets].sort((a, b) => {
    const ra = sessionRank.get(a.session_id) ?? 999
    const rb = sessionRank.get(b.session_id) ?? 999
    return ra - rb
  })

  const exerciseIdSet = new Set(exerciseIds)
  const result: Record<string, PrevSetEntry> = {}

  for (const set of sorted) {
    const exId = (
      set.client_plan_day_exercises as { exercise_id: string } | null
    )?.exercise_id
    if (!exId || !exerciseIdSet.has(exId)) continue
    const key = `${exId}:${set.set_number}`
    if (result[key]) continue // ya tenemos la entrada más reciente
    result[key] = {
      weightKg: set.weight_kg ?? null,
      repsPerformed: set.reps_performed ?? null,
    }
  }

  return result
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/queries.ts
git commit -m "feat(training): add getPrevSessionSets query for inline history"
```

---

### Task 2: Page pasa `prevSets` a `LiveTraining`

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/page.tsx`
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx` — solo la firma del componente y el tipo prop (sin cambios de render aún)

- [ ] **Step 1: Actualizar page.tsx**

Reemplazar el contenido completo de `page.tsx`:

```typescript
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getLiveSessionData, getPrevSessionSets } from './queries'
import LiveTraining from './live-training'

export default async function LiveTrainingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const session = await getLiveSessionData(sessionId, user.id)
  if (!session) notFound()

  const exerciseIds = session.exercises.map((e) => e.exerciseId)
  const prevSets = await getPrevSessionSets(user.id, exerciseIds, sessionId)

  return <LiveTraining session={session} prevSets={prevSets} />
}
```

- [ ] **Step 2: Añadir `prevSets` prop a LiveTraining (solo la firma — sin render aún)**

En `live-training.tsx`, cambiar la firma del componente. Actualmente es:

```typescript
export default function LiveTraining({ session }: { session: LiveSessionData }) {
```

Reemplazar con:

```typescript
import type { PrevSetEntry } from './queries'

// ...

export default function LiveTraining({
  session,
  prevSets = {},
}: {
  session: LiveSessionData
  prevSets?: Record<string, PrevSetEntry>
}) {
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/page.tsx src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): wire prevSets prop through page to LiveTraining"
```

---

### Task 3: `FlatSet` incluye `exerciseId` + render de referencia histórica

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Añadir `exerciseId` al tipo `FlatSet`**

Localizar el tipo `FlatSet` (~línea 31). Añadir el campo:

```typescript
type FlatSet = {
  exerciseIndex: number
  totalExercises: number
  exerciseName: string
  muscleGroup: string | null
  videoUrl: string | null
  type: 'strength' | 'cardio'
  setNumber: number
  totalSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  clientPlanDayExerciseId: string
  exerciseId: string                    // ← nuevo
}
```

- [ ] **Step 2: Pasar `exerciseId` en `buildFlatSets`**

Localizar `buildFlatSets` (~línea 51). Dentro del `flatMap`, añadir `exerciseId: ex.exerciseId` en el objeto retornado:

```typescript
function buildFlatSets(exercises: LiveExercise[]): FlatSet[] {
  const totalExercises = exercises.length
  return exercises.flatMap((ex, exerciseIndex) =>
    Array.from({ length: ex.plannedSets }, (_, i) => {
      const setNumber = i + 1
      return {
        exerciseIndex,
        totalExercises,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup?.trim() ? ex.muscleGroup : null,
        videoUrl: ex.videoUrl,
        type: ex.type,
        setNumber,
        totalSets: ex.plannedSets,
        plannedRepsMin: ex.plannedRepsMin,
        plannedRepsMax: ex.plannedRepsMax,
        plannedDurationSeconds: ex.plannedDurationSeconds,
        restSeconds: ex.restSeconds,
        clientPlanDayExerciseId: ex.clientPlanDayExerciseId,
        exerciseId: ex.exerciseId,                              // ← nuevo
      }
    })
  )
}
```

- [ ] **Step 3: Renderizar referencia histórica en el set activo**

Localizar el bloque `{isActive ? (` (~línea 920). Dentro del `<div style={{ display: 'flex', flexDirection: 'column', gap: 24 ...}}>` que contiene el input y el botón Check, añadir el bloque de referencia ANTES del input:

```typescript
{isActive ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
    
    {/* Referencia sesión anterior */}
    {(() => {
      const prevKey = `${fs.exerciseId}:${fs.setNumber}`
      const prev = prevSets[prevKey]
      if (!prev) return null
      const label =
        fs.type === 'strength' && prev.weightKg != null
          ? `${prev.weightKg} kg × ${prev.repsPerformed ?? '—'} reps`
          : fs.type === 'cardio' && prev.repsPerformed != null
          ? `${prev.repsPerformed} seg`
          : null
      if (!label) return null
      return (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: '#6B7280',
            letterSpacing: '0.02em',
          }}
        >
          Última vez:{' '}
          <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
        </p>
      )
    })()}

    {/* input existente */}
    <motion.div ...>
```

> **Nota:** Mantener todo el JSX existente del input y el botón Check sin cambios. Solo añadir el bloque de referencia antes del input.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(training\)/client/training/\[sessionId\]/live-training.tsx
git commit -m "feat(training): show previous session weight/reps inline during workout logging"
```

---

## Self-Review

- ✅ Query solo se ejecuta si hay exerciseIds
- ✅ Default `prevSets = {}` para retroactive logging (que no pasa prevSets)
- ✅ Referencia solo aparece en el set activo (`isActive`)
- ✅ No bloquea render si no hay historial previo
- ✅ Maneja ejercicios cardio (duration) y fuerza (weight × reps)
