# UI — Builder, Training & Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** `2026-04-20-foundation-data-model.md` must be fully complete before starting this plan.

**Goal:** Update all client-facing and coach-facing UI to use the new data model — multi-week plan builder, reps tracking in live training, RPE at session end, and a client progress view.

**Architecture:** Four independent UI areas, each building on the foundation from Plan A. The plan builder gets a week-tab system with copy-week shortcut. Live training gets a reps input for strength sets and an RPE modal at session end. Client progress becomes a new `/client/progress` route with exercise history, PRs, and body measurement history.

**Tech Stack:** Next.js App Router, React hooks, Framer Motion (already installed), Recharts (install if not present), Supabase client, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/features/training/types.ts` |
| Modify | `src/app/(training)/client/training/[sessionId]/queries.ts` |
| Modify | `src/app/(training)/client/training/[sessionId]/live-training.tsx` |
| Modify | `src/app/(coach)/coach/library/plans/plan-builder-form.tsx` |
| Modify | `src/app/(coach)/coach/library/plans/queries.ts` (plan edit initial data) |
| Create | `src/app/(client)/client/progress/page.tsx` |
| Create | `src/app/(client)/client/progress/queries.ts` |
| Create | `src/app/(client)/client/progress/progress-view.tsx` |
| Modify | `src/components/ui/client-bottom-nav.tsx` (add Progress tab) |

---

## Task 1: Update training types

**Why:** `LiveExercise.plannedReps` is a single integer. After Plan A migrations, the DB has `reps_min` and `reps_max`. All types referencing `plannedReps` must be updated to `plannedRepsMin` and `plannedRepsMax`. `SetLog` must include `repsPerformed`. `LiveSessionData` must include RPE fields.

**Files:**
- Modify: `src/features/training/types.ts`

- [ ] **Step 1: Update types**

In `src/features/training/types.ts`, make these targeted changes:

1. Update `SetLog` (add `repsPerformed`):
```typescript
export type SetLog = {
  setNumber: number
  repsPerformed: number | null   // was missing
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}
```

2. Update `LiveExercise` (replace `plannedReps`):
```typescript
export type LiveExercise = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  order: number
  plannedSets: number
  plannedRepsMin: number | null   // replaces plannedReps
  plannedRepsMax: number | null   // new
  plannedDurationSeconds: number | null
  restSeconds: number | null
  videoUrl: string | null
  loggedSets: SetLog[]
}
```

3. Update `DayExerciseDetail` (same rename):
```typescript
export type DayExerciseDetail = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  order: number
  plannedSets: number
  plannedRepsMin: number | null   // replaces plannedReps
  plannedRepsMax: number | null   // new
  plannedDurationSeconds: number | null
  restSeconds: number | null
  videoUrl: string | null
}
```

4. Update `WeekDetailExercise` (same rename):
```typescript
export type WeekDetailExercise = {
  clientPlanDayExerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  plannedRepsMin: number | null   // replaces plannedReps
  plannedRepsMax: number | null   // new
  plannedDurationSeconds: number | null
  sets: WeekDetailSet[]
}
```

5. Update `WeekDetailSet` (add `repsPerformed`):
```typescript
export type WeekDetailSet = {
  setNumber: number
  repsPerformed: number | null   // new
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}
```

Also add a helper type for the client progress views (add at the end of the file):
```typescript
// ── Client progress types ──────────────────────────────────────────────────

export type ExercisePR = {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  bestWeightKg: number | null        // max weight_kg across all completed sets
  bestRepsAtBestWeight: number | null
  totalCompletedSets: number
  lastLoggedAt: string | null
}

export type ExerciseHistoryPoint = {
  sessionDate: string             // ISO date
  weekNumber: number
  setNumber: number
  weightKg: number | null
  repsPerformed: number | null
  durationSeconds: number | null
}

export type ExerciseProgressSeries = {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  history: ExerciseHistoryPoint[]
}

export type ClientProgressData = {
  prs: ExercisePR[]
  bodyMeasurements: Array<{
    date: string
    weightKg: number
  }>
}
```

- [ ] **Step 2: Run TypeScript check — expect errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "plannedReps[^M]|repsPerformed"
```

Expected: TypeScript errors about `plannedReps` not existing. These will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/features/training/types.ts
git commit -m "feat(types): update training types for reps ranges and repsPerformed"
```

---

## Task 2: Update live session query

**Why:** The query selects `reps` from `client_plan_day_exercises` — this column no longer exists after Plan A. Must switch to `reps_min, reps_max`. Also must include `reps_performed` in session_sets.

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/queries.ts`

- [ ] **Step 1: Replace the file**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { LiveSessionData, LiveExercise, SetLog } from '@/features/training/types'

export async function getLiveSessionData(
  sessionId: string,
  clientId: string
): Promise<LiveSessionData | null> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (!session) return null

  const [exercisesResult, setsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
      )
      .eq('client_plan_day_id', session.client_plan_day_id)
      .order('order'),
    supabase
      .from('session_sets')
      .select(
        'client_plan_day_exercise_id, set_number, reps_performed, weight_kg, duration_seconds, completed'
      )
      .eq('session_id', sessionId)
      .order('set_number'),
  ])

  const setsByExId = new Map<string, SetLog[]>()
  for (const s of setsResult.data ?? []) {
    const id = s.client_plan_day_exercise_id
    if (!setsByExId.has(id)) setsByExId.set(id, [])
    setsByExId.get(id)!.push({
      setNumber: s.set_number,
      repsPerformed: s.reps_performed ?? null,
      weightKg: s.weight_kg ?? null,
      durationSeconds: s.duration_seconds ?? null,
      completed: s.completed,
    })
  }

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps_min: number | null
    reps_max: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: {
      id: string
      name: string
      muscle_group: string
      type: string
      video_url: string | null
    } | null
  }

  const exercises: LiveExercise[] = ((exercisesResult.data as ExRow[]) ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercises?.name ?? 'Ejercicio',
    muscleGroup: ex.exercises?.muscle_group ?? '',
    type: (ex.exercises?.type as 'strength' | 'cardio') ?? 'strength',
    order: ex.order,
    plannedSets: ex.sets,
    plannedRepsMin: ex.reps_min ?? null,
    plannedRepsMax: ex.reps_max ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
    restSeconds: ex.rest_seconds ?? null,
    videoUrl: ex.exercises?.video_url ?? null,
    loggedSets: setsByExId.get(ex.id) ?? [],
  }))

  return {
    sessionId: session.id,
    clientPlanDayId: session.client_plan_day_id,
    status: session.status as 'in_progress' | 'completed',
    exercises,
  }
}
```

- [ ] **Step 2: Check TypeScript for this file**

```bash
npx tsc --noEmit 2>&1 | grep "queries.ts"
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(training)/client/training/[sessionId]/queries.ts"
git commit -m "feat(training): update live session query for reps_min/max and reps_performed"
```

---

## Task 3: Update live-training.tsx — reps input + RPE modal

**Why:** The live training screen needs two new features:
1. For `strength` exercises: show a reps input field alongside weight, and send `repsPerformed` when completing a set.
2. After all sets are done: show an RPE selector (1–10) before calling `completeSessionAction`.

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

This is a large component. Below are the **exact targeted changes** — do not rewrite the whole file, only patch these sections.

- [ ] **Step 1: Update `SetInputs` type and `FlatSet` type**

Find `type SetInputs = { weight: string; duration: string }` and replace:
```typescript
type SetInputs = { weight: string; reps: string; duration: string }
```

Find `type FlatSet` block and update `plannedReps` to `plannedRepsMin` and `plannedRepsMax`:
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
  plannedRepsMin: number | null    // replaces plannedReps
  plannedRepsMax: number | null    // new
  plannedDurationSeconds: number | null
  restSeconds: number | null
  clientPlanDayExerciseId: string
}
```

- [ ] **Step 2: Update `buildFlatSets` to use new fields**

Find this line inside `buildFlatSets`:
```typescript
plannedReps: ex.plannedReps,
```
Replace with:
```typescript
plannedRepsMin: ex.plannedRepsMin,
plannedRepsMax: ex.plannedRepsMax,
```

- [ ] **Step 3: Add RPE state and update inputs initialization**

After the existing `useState` declarations (after `inputFocusIdx`), add:
```typescript
const [rpe, setRpe] = useState<number | null>(null)
const [showRpeModal, setShowRpeModal] = useState(false)
```

In the `inputs` `useState` initializer, find `weight: set.weightKg != null ? String(set.weightKg) : ''` and update the `SetInputs` construction:
```typescript
m.set(makeKey(ex.clientPlanDayExerciseId, set.setNumber), {
  weight: set.weightKg != null ? String(set.weightKg) : '',
  reps: set.repsPerformed != null ? String(set.repsPerformed) : '',
  duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
})
```

Also update the reset block inside the session-change `useEffect` (find the same pattern there):
```typescript
m.set(makeKey(ex.clientPlanDayExerciseId, set.setNumber), {
  weight: set.weightKg != null ? String(set.weightKg) : '',
  reps: set.repsPerformed != null ? String(set.repsPerformed) : '',
  duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
})
```

Also add `rpe: null` and `showRpeModal: false` to the session-reset block:
```typescript
setRpe(null)
setShowRpeModal(false)
```

- [ ] **Step 4: Update `handleCompleteSet` to send `repsPerformed`**

Find the `handleCompleteSet` function. Inside the `startTransition` callback, find:
```typescript
if (fs.type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
if (fs.type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)
```
Replace with:
```typescript
if (fs.type === 'strength') {
  if (inp.weight) formData.set('weightKg', inp.weight)
  if (inp.reps) formData.set('repsPerformed', inp.reps)
}
if (fs.type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)
```

- [ ] **Step 5: Update `handleFinish` to show RPE modal first**

Find `handleFinish` and replace:
```typescript
function handleFinish() {
  startTransition(async () => {
    await completeSessionAction(session.sessionId)
    setIsFinished(true)
  })
}
```
With:
```typescript
function handleFinish() {
  setShowRpeModal(true)
}

function handleConfirmFinish() {
  startTransition(async () => {
    await completeSessionAction(session.sessionId, rpe ?? undefined)
    setIsFinished(true)
    setShowRpeModal(false)
  })
}
```

- [ ] **Step 6: Add reps input to the set card UI**

The set card renders inputs for weight (strength) and duration (cardio). Find the weight input section (look for `inp.weight` or `weightKg`). After the weight input block, add the reps input for strength sets:

```tsx
{fs.type === 'strength' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, color: LT.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {fs.plannedRepsMin != null
        ? fs.plannedRepsMax != null && fs.plannedRepsMax !== fs.plannedRepsMin
          ? `Reps (${fs.plannedRepsMin}–${fs.plannedRepsMax})`
          : `Reps (${fs.plannedRepsMin})`
        : 'Reps'}
    </label>
    <input
      type="number"
      inputMode="numeric"
      min={1}
      placeholder={
        fs.plannedRepsMin != null
          ? String(fs.plannedRepsMin)
          : '—'
      }
      value={getInput(fs.clientPlanDayExerciseId, fs.setNumber).reps}
      onChange={(e) =>
        updateInput(fs.clientPlanDayExerciseId, fs.setNumber, { reps: e.target.value })
      }
      style={{
        width: '100%',
        height: 48,
        backgroundColor: LT.track,
        border: `1px solid ${LT.border}`,
        borderRadius: 10,
        color: LT.text,
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        outline: 'none',
      }}
    />
  </div>
)}
```

- [ ] **Step 7: Add RPE modal to the JSX**

Before the closing `</div>` of the component's return, add the RPE selection modal. This renders on top of the screen when `showRpeModal` is true:

```tsx
{showRpeModal && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      gap: 24,
    }}
  >
    <p style={{ fontSize: 20, fontWeight: 700, color: LT.text, textAlign: 'center' }}>
      ¿Cómo estuvo el entrenamiento?
    </p>
    <p style={{ fontSize: 13, color: LT.muted, textAlign: 'center' }}>
      RPE — Esfuerzo percibido (opcional)
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setRpe((prev) => (prev === n ? null : n))}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: rpe === n ? `2px solid ${LT.lime}` : `1px solid ${LT.border}`,
            backgroundColor: rpe === n ? LT.limeSoft : LT.track,
            color: rpe === n ? LT.lime : LT.secondary,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
      <button
        type="button"
        disabled={isPending}
        onClick={handleConfirmFinish}
        style={{
          height: 52,
          borderRadius: 14,
          border: 'none',
          backgroundColor: LT.lime,
          color: '#0A0A0A',
          fontSize: 16,
          fontWeight: 700,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Guardando…' : 'Finalizar entrenamiento'}
      </button>
      <button
        type="button"
        onClick={() => setShowRpeModal(false)}
        style={{
          height: 44,
          borderRadius: 14,
          border: `1px solid ${LT.border}`,
          backgroundColor: 'transparent',
          color: LT.muted,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Volver
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 8: Fix TypeScript errors from the component**

```bash
npx tsc --noEmit 2>&1 | grep "live-training"
```

Fix any remaining errors (usually the `handleUpdateSet` function still using old `weightKg`/`durationSeconds` pattern — update it to also pass `repsPerformed` the same way as `handleCompleteSet`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/(training)/client/training/[sessionId]/live-training.tsx"
git commit -m "feat(training): add reps input for strength sets and RPE modal at session end"
```

---

## Task 4: Update plan builder — multi-week support

**Why:** `plan-builder-form.tsx` manages a single `Record<number, DayDraft>` state (one day config per day-of-week, same for all weeks). It must be refactored to manage a `WeekDraft[]` where each week has its own set of days.

**Files:**
- Modify: `src/app/(coach)/coach/library/plans/plan-builder-form.tsx`

This task requires the most changes. The key structural change is in the state shape. The day-editing UI remains identical — it just operates on the currently selected week.

- [ ] **Step 1: Update the types at the top of the file**

Find `type ExerciseLine` and replace:
```typescript
type ExerciseLine = {
  id: string
  exerciseId: string
  sets: string
  repsMin: string      // replaces reps
  repsMax: string      // new — empty string means "same as min" / no upper bound
  durationSeconds: string
  restSeconds: string
}
```

Add below `ExerciseLine`:
```typescript
type WeekDraft = {
  weekName: string
  weekType: 'normal' | 'deload' | 'peak' | 'test'
  days: Record<number, DayDraft>
}
```

- [ ] **Step 2: Update `emptyDays` (no change needed), update `daysFromInitial`, add helpers**

Find `function daysFromInitial` and replace:
```typescript
function daysFromInitial(initial: PlanBuilderInitial): WeekDraft[] {
  // Initial data comes from existing plan_weeks. Each week has its own days.
  // Group initial.days by weekNumber (PlanBuilderInitial must be updated to include weekNumber).
  return initial.planWeeks.map((week) => {
    const days = emptyDays()
    for (const day of week.days) {
      days[day.dayOfWeek] = {
        enabled: true,
        exercises: day.exercises.map((e) => ({
          id: crypto.randomUUID(),
          exerciseId: e.exerciseId,
          sets: String(e.sets),
          repsMin: e.repsMin != null ? String(e.repsMin) : '',
          repsMax: e.repsMax != null ? String(e.repsMax) : '',
          durationSeconds: e.durationSeconds != null ? String(e.durationSeconds) : '600',
          restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
        })),
      }
    }
    return { weekName: week.weekName ?? `Semana ${week.weekNumber}`, weekType: week.weekType, days }
  })
}

function emptyWeekDraft(weekNumber: number): WeekDraft {
  return { weekName: `Semana ${weekNumber}`, weekType: 'normal', days: emptyDays() }
}

function initialWeekDrafts(weeks: number, initial?: PlanBuilderInitial): WeekDraft[] {
  if (initial) return daysFromInitial(initial)
  return Array.from({ length: weeks }, (_, i) => emptyWeekDraft(i + 1))
}
```

- [ ] **Step 3: Update `newLine` helper to use `repsMin`/`repsMax`**

Find `function newLine(): ExerciseLine` and replace:
```typescript
function newLine(): ExerciseLine {
  return {
    id: crypto.randomUUID(),
    exerciseId: '',
    sets: '3',
    repsMin: '10',
    repsMax: '',
    durationSeconds: '600',
    restSeconds: '60',
  }
}
```

- [ ] **Step 4: Update component state**

Inside the component function, find the `useState` for days. Replace:
```typescript
const [weekDrafts, setWeekDrafts] = useState<WeekDraft[]>(() =>
  initialWeekDrafts(initialWeeks, initial)
)
const [activeWeekIdx, setActiveWeekIdx] = useState(0)
```

Remove the old `const [days, setDays]` state.

- [ ] **Step 5: Add copy-week helper**

Add this function inside the component (before the return):
```typescript
function copyWeekFrom(targetIdx: number, sourceIdx: number) {
  setWeekDrafts((prev) => {
    const next = [...prev]
    next[targetIdx] = {
      ...next[targetIdx],
      days: JSON.parse(JSON.stringify(next[sourceIdx].days)) as Record<number, DayDraft>,
    }
    return next
  })
}
```

- [ ] **Step 6: Update all day-mutation functions to scope to active week**

Every function that currently does `setDays(...)` must now do `setWeekDrafts(prev => { const next = [...prev]; next[activeWeekIdx] = { ...next[activeWeekIdx], days: ... }; return next })`.

For example, find the function that toggles a day enabled/disabled:
```typescript
// Old pattern:
setDays((prev) => ({ ...prev, [dow]: { ...prev[dow], enabled: !prev[dow].enabled } }))

// New pattern:
setWeekDrafts((prev) => {
  const next = [...prev]
  const w = next[activeWeekIdx]!
  next[activeWeekIdx] = {
    ...w,
    days: { ...w.days, [dow]: { ...w.days[dow]!, enabled: !w.days[dow]!.enabled } },
  }
  return next
})
```

Apply the same pattern to: adding an exercise, removing an exercise, updating an exercise field.

The current "active days" derivation `Object.entries(days)...` becomes:
```typescript
const activeDays = weekDrafts[activeWeekIdx]?.days ?? emptyDays()
```

- [ ] **Step 7: Update weeks input to resize weekDrafts array**

When the coach changes the `weeks` number input, `weekDrafts` must grow or shrink accordingly. Find the `weeks` state and its onChange. After updating weeks, sync weekDrafts:
```typescript
function handleWeeksChange(newWeeks: number) {
  setWeeks(newWeeks)
  setWeekDrafts((prev) => {
    if (newWeeks > prev.length) {
      const added = Array.from(
        { length: newWeeks - prev.length },
        (_, i) => emptyWeekDraft(prev.length + i + 1)
      )
      return [...prev, ...added]
    }
    return prev.slice(0, newWeeks)
  })
  if (activeWeekIdx >= newWeeks) setActiveWeekIdx(newWeeks - 1)
}
```

- [ ] **Step 8: Add week selector tabs above the day grid**

Find the section where days are rendered (after the plan meta fields, before the day pills). Add a week selector row:

```tsx
{/* Week tabs */}
<div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
  {weekDrafts.map((w, i) => (
    <button
      key={i}
      type="button"
      onClick={() => setActiveWeekIdx(i)}
      style={{
        flexShrink: 0,
        height: 36,
        paddingLeft: 14,
        paddingRight: 14,
        borderRadius: 20,
        border: activeWeekIdx === i ? '1.5px solid #B5F23D' : '1px solid #2A2D34',
        backgroundColor: activeWeekIdx === i ? 'rgba(181,242,61,0.1)' : '#111317',
        color: activeWeekIdx === i ? '#B5F23D' : '#9CA3AF',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {w.weekType === 'deload' ? `S${i + 1} · Deload` : `Semana ${i + 1}`}
    </button>
  ))}
</div>

{/* Week options: name, type, copy from previous */}
<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
  <input
    type="text"
    value={weekDrafts[activeWeekIdx]?.weekName ?? ''}
    onChange={(e) =>
      setWeekDrafts((prev) => {
        const next = [...prev]
        next[activeWeekIdx] = { ...next[activeWeekIdx]!, weekName: e.target.value }
        return next
      })
    }
    placeholder="Nombre de la semana"
    style={{ ...inputStyle, width: 180 }}
  />
  <select
    value={weekDrafts[activeWeekIdx]?.weekType ?? 'normal'}
    onChange={(e) =>
      setWeekDrafts((prev) => {
        const next = [...prev]
        next[activeWeekIdx] = {
          ...next[activeWeekIdx]!,
          weekType: e.target.value as WeekDraft['weekType'],
        }
        return next
      })
    }
    style={{ ...inputStyle, width: 140 }}
  >
    <option value="normal">Normal</option>
    <option value="deload">Deload</option>
    <option value="peak">Peak</option>
    <option value="test">Test</option>
  </select>
  {activeWeekIdx > 0 && (
    <button
      type="button"
      onClick={() => copyWeekFrom(activeWeekIdx, activeWeekIdx - 1)}
      style={{
        height: 36,
        paddingLeft: 14,
        paddingRight: 14,
        borderRadius: 10,
        border: '1px solid #2A2D34',
        backgroundColor: '#111317',
        color: '#9CA3AF',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      Copiar semana anterior
    </button>
  )}
</div>
```

- [ ] **Step 9: Update exercise line UI — `reps` → `repsMin` + `repsMax`**

Find where `reps` is rendered as an input field for each exercise line. Replace:
```tsx
{/* Old: single reps field */}
<input value={line.reps} onChange={...} placeholder="10" />
```
With two fields side by side:
```tsx
{/* repsMin / repsMax */}
{ex.type !== 'cardio' && (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    <input
      type="number"
      min={1}
      value={line.repsMin}
      onChange={(e) => updateExerciseLine(dow, line.id, { repsMin: e.target.value })}
      placeholder="Min"
      style={{ ...inputStyle, width: 64 }}
    />
    <span style={{ color: '#6B7280', fontSize: 12 }}>–</span>
    <input
      type="number"
      min={1}
      value={line.repsMax}
      onChange={(e) => updateExerciseLine(dow, line.id, { repsMax: e.target.value })}
      placeholder="Max"
      style={{ ...inputStyle, width: 64 }}
    />
  </div>
)}
```

- [ ] **Step 10: Update payload serialization**

Find the `handleSubmit` or the payload building logic (look for `planPayload`). Replace the old flat `days` serialization:

```typescript
const payload = {
  name,
  description: description || undefined,
  weeks,
  planWeeks: weekDrafts.map((w, i) => ({
    weekNumber: i + 1,
    weekName: w.weekName,
    weekType: w.weekType,
    days: Object.entries(w.days)
      .filter(([, d]) => d.enabled && d.exercises.length > 0)
      .map(([dow, d]) => ({
        dayOfWeek: Number(dow),
        exercises: d.exercises
          .filter((e) => e.exerciseId)
          .map((e, idx) => ({
            exerciseId: e.exerciseId,
            order: idx + 1,
            sets: Number(e.sets) || 3,
            repsMin: e.repsMin ? Number(e.repsMin) : undefined,
            repsMax: e.repsMax ? Number(e.repsMax) : undefined,
            durationSeconds: e.durationSeconds ? Number(e.durationSeconds) : undefined,
            restSeconds: e.restSeconds ? Number(e.restSeconds) : undefined,
          })),
      })),
  })),
}
formData.set('planPayload', JSON.stringify(payload))
```

- [ ] **Step 11: Update `queries.ts` for plan builder initial data**

The plan builder edit mode loads initial data. The query must now load `plan_weeks → plan_days → plan_day_exercises` instead of `plan_days`. Find `src/app/(coach)/coach/library/plans/queries.ts` and update the `getPlanBuilderInitial` function:

```typescript
export type PlanBuilderInitialExercise = {
  exerciseId: string
  order: number
  sets: number
  repsMin: number | null    // replaces reps
  repsMax: number | null    // new
  durationSeconds: number | null
  restSeconds: number | null
}

export type PlanBuilderInitialDay = {
  dayOfWeek: number
  exercises: PlanBuilderInitialExercise[]
}

export type PlanBuilderInitialWeek = {
  weekNumber: number
  weekName: string | null
  weekType: string
  days: PlanBuilderInitialDay[]
}

export type PlanBuilderInitial = {
  id: string
  name: string
  description: string | null
  weeks: number
  planWeeks: PlanBuilderInitialWeek[]
}

export async function getPlanBuilderInitial(
  planId: string,
  coachId: string
): Promise<PlanBuilderInitial | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('plans')
    .select(`
      id, name, description, weeks,
      plan_weeks (
        id, week_number, week_name, week_type,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds
          )
        )
      )
    `)
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    weeks: data.weeks,
    planWeeks: (data.plan_weeks ?? [])
      .sort((a, b) => a.week_number - b.week_number)
      .map((w) => ({
        weekNumber: w.week_number,
        weekName: w.week_name,
        weekType: w.week_type,
        days: (w.plan_days ?? [])
          .sort((a, b) => a.order - b.order)
          .map((d) => ({
            dayOfWeek: d.day_of_week,
            exercises: (d.plan_day_exercises ?? [])
              .sort((a, b) => a.order - b.order)
              .map((e) => ({
                exerciseId: e.exercise_id,
                order: e.order,
                sets: e.sets,
                repsMin: e.reps_min,
                repsMax: e.reps_max,
                durationSeconds: e.duration_seconds,
                restSeconds: e.rest_seconds,
              })),
          })),
      })),
  }
}
```

- [ ] **Step 12: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "plan-builder-form\|queries.ts"
```

Fix any remaining errors. Common issues: old `ExercisePick` and `PlanBuilderInitial` types being imported from a stale location.

- [ ] **Step 13: Commit**

```bash
git add "src/app/(coach)/coach/library/plans/plan-builder-form.tsx" "src/app/(coach)/coach/library/plans/queries.ts"
git commit -m "feat(builder): multi-week plan builder with week tabs, copy shortcut, and reps ranges"
```

---

## Task 5: Fix remaining TypeScript errors across the codebase

**Why:** Multiple files reference `plannedReps`, `.reps`, and old type shapes. These must all be updated before the build is clean.

**Files:**
- Any file with TypeScript errors from `npx tsc --noEmit`

- [ ] **Step 1: Run full TypeScript check and list errors**

```bash
npx tsc --noEmit 2>&1 | head -80
```

- [ ] **Step 2: Fix each error**

Common patterns to fix:

**`repsMin`/`repsMax` display in any UI showing plan exercise details:**
```tsx
// Pattern to display reps range:
{ex.reps_min != null
  ? ex.reps_max != null && ex.reps_max !== ex.reps_min
    ? `${ex.reps_min}–${ex.reps_max} reps`
    : `${ex.reps_min} reps`
  : ex.duration_seconds != null
    ? `${ex.duration_seconds}s`
    : '—'}
```

**`plannedReps` → `plannedRepsMin` / `plannedRepsMax` in any component using `LiveExercise` or `DayExerciseDetail`:**
```tsx
// Old:
{ex.plannedReps != null ? `${ex.plannedReps} reps` : '—'}

// New:
{ex.plannedRepsMin != null
  ? ex.plannedRepsMax != null && ex.plannedRepsMax !== ex.plannedRepsMin
    ? `${ex.plannedRepsMin}–${ex.plannedRepsMax} reps`
    : `${ex.plannedRepsMin} reps`
  : '—'}
```

**`reps` in client_plan_day_exercises queries (day detail, history):**
Replace all `.reps` column references with `.reps_min, .reps_max` in Supabase select strings and their corresponding TypeScript row types.

- [ ] **Step 3: Verify zero errors**

```bash
npx tsc --noEmit
```

Expected: exit code 0, no output.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve all TypeScript errors from reps_min/max and training type updates"
```

---

## Task 6: Client progress view

**Why:** The user's decision: clients must be able to see their exercise history, best marks (PRs), basic charts, and body measurement history. Currently there is no `/client/progress` route.

**Files:**
- Create: `src/app/(client)/client/progress/queries.ts`
- Create: `src/app/(client)/client/progress/page.tsx`
- Create: `src/app/(client)/client/progress/progress-view.tsx`
- Modify: `src/components/ui/client-bottom-nav.tsx`

- [ ] **Step 1: Create `queries.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { ExercisePR, ClientProgressData } from '@/features/training/types'

export async function getClientProgressData(
  clientId: string
): Promise<ClientProgressData> {
  const supabase = await createClient()

  // PRs: for each exercise, find best weight across all completed sets
  const { data: setRows } = await supabase
    .from('session_sets')
    .select(`
      weight_kg,
      reps_performed,
      logged_at,
      client_plan_day_exercises (
        exercise_id,
        exercises (
          id, name, muscle_group
        )
      )
    `)
    .eq('completed', true)
    .in(
      'session_id',
      supabase
        .from('sessions')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'completed')
    )
    .order('weight_kg', { ascending: false })

  type SetRow = {
    weight_kg: number | null
    reps_performed: number | null
    logged_at: string | null
    client_plan_day_exercises: {
      exercise_id: string
      exercises: { id: string; name: string; muscle_group: string } | null
    } | null
  }

  const prMap = new Map<string, ExercisePR>()
  for (const row of (setRows as SetRow[]) ?? []) {
    const ex = row.client_plan_day_exercises?.exercises
    if (!ex) continue
    const existing = prMap.get(ex.id)
    const bestWeight = row.weight_kg ?? 0
    if (!existing || (row.weight_kg != null && bestWeight > (existing.bestWeightKg ?? 0))) {
      prMap.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscle_group,
        bestWeightKg: row.weight_kg,
        bestRepsAtBestWeight: row.reps_performed,
        totalCompletedSets: (existing?.totalCompletedSets ?? 0) + 1,
        lastLoggedAt: row.logged_at,
      })
    } else if (existing) {
      existing.totalCompletedSets += 1
    }
  }

  // Body measurements
  const { data: bodyRows } = await supabase
    .from('body_measurements')
    .select('date, weight_kg')
    .eq('client_id', clientId)
    .order('date', { ascending: true })

  return {
    prs: Array.from(prMap.values()).sort(
      (a, b) => (b.bestWeightKg ?? 0) - (a.bestWeightKg ?? 0)
    ),
    bodyMeasurements: (bodyRows ?? [])
      .filter((r) => r.weight_kg != null)
      .map((r) => ({ date: r.date, weightKg: r.weight_kg as number })),
  }
}

export async function getExerciseHistory(
  clientId: string,
  exerciseId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('session_sets')
    .select(`
      set_number,
      weight_kg,
      reps_performed,
      duration_seconds,
      logged_at,
      sessions!inner (
        id, completed_at, client_id,
        client_plan_days!inner (
          week_number
        )
      ),
      client_plan_day_exercises!inner (
        exercise_id
      )
    `)
    .eq('client_plan_day_exercises.exercise_id', exerciseId)
    .eq('sessions.client_id', clientId)
    .eq('sessions.status', 'completed')
    .eq('completed', true)
    .order('logged_at', { ascending: true })

  type Row = {
    set_number: number
    weight_kg: number | null
    reps_performed: number | null
    duration_seconds: number | null
    logged_at: string | null
    sessions: { completed_at: string | null; client_plan_days: { week_number: number }[] } | null
    client_plan_day_exercises: { exercise_id: string } | null
  }

  return ((data as Row[]) ?? []).map((r) => ({
    sessionDate: r.sessions?.completed_at?.split('T')[0] ?? r.logged_at?.split('T')[0] ?? '',
    weekNumber: r.sessions?.client_plan_days?.[0]?.week_number ?? 0,
    setNumber: r.set_number,
    weightKg: r.weight_kg,
    repsPerformed: r.reps_performed,
    durationSeconds: r.duration_seconds,
  }))
}
```

- [ ] **Step 2: Create `page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientProgressData } from './queries'
import ProgressView from './progress-view'

export default async function ClientProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientProgressData(user.id)

  return <ProgressView data={data} clientId={user.id} />
}
```

- [ ] **Step 3: Create `progress-view.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { ClientProgressData } from '@/features/training/types'

const T = {
  bg: '#0A0A0A',
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

export default function ProgressView({
  data,
}: {
  data: ClientProgressData
  clientId: string
}) {
  const [tab, setTab] = useState<'prs' | 'body'>('prs')

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
          Mi progreso
        </h1>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 0' }}>
        {(['prs', 'body'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              height: 36,
              paddingLeft: 16,
              paddingRight: 16,
              borderRadius: 20,
              border: tab === t ? `1.5px solid ${T.lime}` : `1px solid ${T.border}`,
              backgroundColor: tab === t ? 'rgba(181,242,61,0.1)' : T.card,
              color: tab === t ? T.lime : T.secondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t === 'prs' ? 'Ejercicios' : 'Cuerpo'}
          </button>
        ))}
      </div>

      {tab === 'prs' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.prs.length === 0 && (
            <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              Todavía no hay datos de progreso. Completá tu primer entrenamiento.
            </p>
          )}
          {data.prs.map((pr) => (
            <div
              key={pr.exerciseId}
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
                  {pr.exerciseName}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
                  {pr.muscleGroup} · {pr.totalCompletedSets} sets registrados
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {pr.bestWeightKg != null ? (
                  <>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.lime }}>
                      {pr.bestWeightKg} kg
                    </p>
                    {pr.bestRepsAtBestWeight != null && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>
                        × {pr.bestRepsAtBestWeight} reps
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Sin peso registrado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'body' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.bodyMeasurements.length === 0 && (
            <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              No hay mediciones corporales registradas todavía.
            </p>
          )}
          {[...data.bodyMeasurements].reverse().map((m, i) => (
            <div
              key={i}
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: T.secondary }}>
                {new Date(m.date).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
                {m.weightKg} kg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add Progress to client bottom nav**

Open `src/components/ui/client-bottom-nav.tsx`. Find the nav items array and add a Progress entry. The exact icon and order will depend on the existing nav structure — add it between Plan and History, using `TrendingUp` from lucide-react:

```tsx
// Add to imports:
import { TrendingUp } from 'lucide-react'

// Add to nav items (between Plan and History):
{ href: '/client/progress', label: 'Progreso', icon: TrendingUp },
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "progress"
```

Fix any errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(client)/client/progress/" src/components/ui/client-bottom-nav.tsx
git commit -m "feat(client): add progress view with PRs and body measurement history"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and smoke test**

```bash
npm run dev
```

Test these flows manually:
1. Coach: create a new plan with 3 weeks, week 1 normal, week 2 deload (copy from week 1, reduce sets), week 3 normal. Verify it saves.
2. Coach: edit the plan. Verify week structure loads correctly.
3. Coach: assign plan to a client. Verify client plan days are created for all 3 weeks.
4. Client: start a training session on a day from week 1. Verify reps input appears for strength exercises.
5. Client: complete all sets. Verify RPE modal appears. Set RPE = 8, confirm. Verify session completes.
6. Client: navigate to `/client/progress`. Verify PRs show up.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — UI plan complete"
```

---

## Self-Review Checklist

- [x] `training/types.ts`: `plannedReps` → `plannedRepsMin` + `plannedRepsMax`, `SetLog` has `repsPerformed`, `WeekDetailSet` has `repsPerformed`, client progress types added
- [x] Live session query: selects `reps_min`, `reps_max`, `reps_performed`
- [x] Live training: reps input for strength sets, RPE modal before session completion
- [x] Plan builder: week drafts state, week tabs UI, copy-from-previous-week, `repsMin`/`repsMax` inputs
- [x] Plan builder: weeks change handler resizes `weekDrafts` array
- [x] Plan builder queries: load `plan_weeks` structure for edit mode
- [x] Client progress page: PRs per exercise, body measurements history
- [x] Client bottom nav: Progress tab added
- [x] All TypeScript errors resolved
- [x] Full test suite passes
