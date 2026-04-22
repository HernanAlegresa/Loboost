# Plan 3 — Registro de sesiones pasadas (cliente)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El cliente puede registrar sets, pesos y reps para días de entrenamiento pasados que no registró en vivo. La UX es idéntica al live training pero sin el modo "en vivo".

**Architecture:**
- Desde `/client/history/week/[weekNumber]`, los días que tienen `clientPlanDayId` pero no tienen sesión completada muestran un botón "Registrar sesión".
- Ese botón lleva a `/client/history/week/[weekNumber]/log/[clientPlanDayId]` — una página nueva que carga los ejercicios del día y permite completar sets/reps/peso.
- Se reusan las actions existentes `startSessionAction` y `completeSetAction`. El cierre usa `completeSessionAction` (sin RPE obligatorio — se hace opcional).
- La diferencia con live training: no hay timer, no hay header "En vivo", solo el form de carga.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, inline styles, Server Actions, `useActionState`

---

## Archivos involucrados

- Read: `src/app/(client)/client/history/week/[weekNumber]/queries.ts` (para entender qué devuelve)
- Read: `src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx` (para agregar el botón)
- Modify: `src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx`
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/page.tsx`
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/queries.ts`
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx`

---

## Task 1: Entender el modelo de datos de historial

- [ ] **Step 1: Leer las queries existentes del historial**

```bash
cat "src/app/(client)/client/history/week/[weekNumber]/queries.ts"
```

Confirmar que `WeekDetailData` incluye `clientPlanDayId` por sesión y que hay sesiones sin `sessionId` (días de entrenamiento sin completar).

- [ ] **Step 2: Leer el componente del historial para ubicar dónde agregar el botón**

```bash
cat "src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx"
```

---

## Task 2: Agregar botón "Registrar sesión" en días sin completar

**Files:**
- Modify: `src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx`

- [ ] **Step 1: Agregar import de Link y botón en días no completados**

En `WeekDetailClient`, hay un listado de `data.sessions`. También hay días del plan sin sesión. Se necesita iterar sobre `data.plannedDays` (o la estructura equivalente que tenga `clientPlanDayId` pero no sesión).

Leer el tipo `WeekDetailData` para saber exactamente cómo están los días sin completar. Si la estructura solo incluye sesiones completadas y no los días planificados sin sesión, modificar la query para incluirlos.

**Si la query actual solo devuelve sesiones completadas**, modificar `queries.ts` para devolver también los días planificados sin sesión. Agregar al tipo `WeekDetailData`:

```typescript
export type PlannedDayWithoutSession = {
  clientPlanDayId: string
  dayOfWeek: number
  dateISO: string
  exerciseCount: number
}
```

Y agregar en la query la carga de `client_plan_days` para esa semana que NO tienen sesión completada.

**En el componente**, agregar debajo de las sesiones:

```typescript
import Link from 'next/link'

// Dentro del render, después del listado de sessiones:
{data.plannedDaysWithoutSession?.map((day) => (
  <div
    key={day.clientPlanDayId}
    style={{
      backgroundColor: '#111317',
      border: '1px solid #1F2227',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>
        {DAY_NAMES[day.dayOfWeek]}
      </p>
      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
        {new Date(day.dateISO + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
        {' · '}
        {day.exerciseCount} {day.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
      </p>
    </div>
    <Link
      href={`/client/history/week/${weekNumber}/log/${day.clientPlanDayId}`}
      style={{
        padding: '8px 14px',
        backgroundColor: 'rgba(181,242,61,0.1)',
        border: '1px solid rgba(181,242,61,0.3)',
        borderRadius: 8,
        color: '#B5F23D',
        fontSize: 12,
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      Registrar
    </Link>
  </div>
))}
```

Nota: `weekNumber` debe ser accesible en el componente — pasarlo como prop si no lo está.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit parcial**

```bash
git add "src/app/(client)/client/history/week/[weekNumber]/"
git commit -m "feat(client): show unregistered training days in history with 'Registrar' button"
```

---

## Task 3: Query para la página de carga retroactiva

**Files:**
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/queries.ts`

- [ ] **Step 1: Crear la query que carga los ejercicios del día**

```typescript
import { createClient } from '@/lib/supabase/server'

export type LogSessionExercise = {
  clientPlanDayExerciseId: string
  name: string
  type: 'strength' | 'cardio'
  plannedSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
}

export type LogSessionPageData = {
  clientPlanDayId: string
  dayOfWeek: number
  weekNumber: number
  existingSessionId: string | null
  exercises: LogSessionExercise[]
}

export async function getLogSessionData(
  clientPlanDayId: string,
  clientId: string
): Promise<LogSessionPageData | null> {
  const supabase = await createClient()

  const { data: planDay, error: dayErr } = await supabase
    .from('client_plan_days')
    .select(`
      id, day_of_week, week_number,
      client_plan_day_exercises (
        id, sets, reps_min, reps_max, duration_seconds, rest_seconds,
        exercises ( name, type )
      )
    `)
    .eq('id', clientPlanDayId)
    .single()

  if (dayErr || !planDay) return null

  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_plan_day_id', clientPlanDayId)
    .eq('client_id', clientId)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle()

  type RawExercise = {
    id: string
    sets: number
    reps_min: number | null
    reps_max: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: { name: string; type: string } | null
  }

  const exercises: LogSessionExercise[] = ((planDay.client_plan_day_exercises as RawExercise[]) ?? [])
    .map((ex) => ({
      clientPlanDayExerciseId: ex.id,
      name: ex.exercises?.name ?? 'Ejercicio',
      type: (ex.exercises?.type ?? 'strength') as 'strength' | 'cardio',
      plannedSets: ex.sets,
      plannedRepsMin: ex.reps_min,
      plannedRepsMax: ex.reps_max,
      plannedDurationSeconds: ex.duration_seconds,
      restSeconds: ex.rest_seconds,
    }))

  return {
    clientPlanDayId,
    dayOfWeek: planDay.day_of_week,
    weekNumber: planDay.week_number,
    existingSessionId: existingSession?.id ?? null,
    exercises,
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 4: Componente cliente de carga retroactiva

**Files:**
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/log-session-client.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import type { LogSessionExercise } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF', bg2: '#0F1014',
} as const

type SetState = {
  reps: string
  weight: string
  duration: string
  completed: boolean
}

type Props = {
  clientPlanDayId: string
  weekNumber: number
  initialSessionId: string | null
  exercises: LogSessionExercise[]
}

export default function LogSessionClient({ clientPlanDayId, weekNumber, initialSessionId, exercises }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [sets, setSets] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {}
    for (const ex of exercises) {
      initial[ex.clientPlanDayExerciseId] = Array.from({ length: ex.plannedSets }, () => ({
        reps: '', weight: '', duration: '', completed: false,
      }))
    }
    return initial
  })
  const [error, setError] = useState<string | null>(null)

  function updateSet(exId: string, setIdx: number, field: keyof SetState, value: string | boolean) {
    setSets((prev) => {
      const copy = { ...prev }
      copy[exId] = copy[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return copy
    })
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId
    const fd = new FormData()
    fd.set('clientPlanDayId', clientPlanDayId)
    const result = await startSessionAction(fd)
    if ('error' in result) { setError(result.error); return null }
    setSessionId(result.sessionId)
    return result.sessionId
  }

  async function markSetComplete(exId: string, setIdx: number, ex: LogSessionExercise) {
    const sid = await ensureSession()
    if (!sid) return

    const s = sets[exId][setIdx]
    const fd = new FormData()
    fd.set('sessionId', sid)
    fd.set('clientPlanDayExerciseId', exId)
    fd.set('setNumber', String(setIdx + 1))
    if (ex.type === 'strength') {
      if (s.reps) fd.set('repsPerformed', s.reps)
      if (s.weight) fd.set('weightKg', s.weight)
    } else {
      if (s.duration) fd.set('durationSeconds', s.duration)
    }

    const result = await completeSetAction(fd)
    if ('error' in result) { setError(result.error); return }
    updateSet(exId, setIdx, 'completed', true)
    setError(null)
  }

  function handleFinish() {
    startTransition(async () => {
      const sid = await ensureSession()
      if (!sid) return
      const fd = new FormData()
      fd.set('sessionId', sid)
      // RPE es opcional en registro retroactivo
      const result = await completeSessionAction(fd)
      if ('error' in result) { setError(result.error); return }
      router.push(`/client/history/week/${weekNumber}`)
      router.refresh()
    })
  }

  const inputStyle = {
    padding: '8px 10px', backgroundColor: T.bg2,
    border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.text, fontSize: 13, width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {exercises.map((ex) => (
        <div key={ex.clientPlanDayExerciseId} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{ex.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
              {ex.plannedSets} series
              {ex.type === 'strength' && ex.plannedRepsMin != null
                ? ` · ${ex.plannedRepsMin}${ex.plannedRepsMax && ex.plannedRepsMax !== ex.plannedRepsMin ? `–${ex.plannedRepsMax}` : ''} reps`
                : ex.type === 'cardio' && ex.plannedDurationSeconds != null
                  ? ` · ${ex.plannedDurationSeconds}s`
                  : ''}
            </p>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(sets[ex.clientPlanDayExerciseId] ?? []).map((s, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                backgroundColor: s.completed ? 'rgba(181,242,61,0.06)' : T.bg2,
                borderRadius: 10,
                border: `1px solid ${s.completed ? 'rgba(181,242,61,0.2)' : T.border}`,
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: T.muted }}>Serie {idx + 1}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {ex.type === 'strength' ? (
                    <>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Peso (kg)</label>
                        <input
                          type="number" step="0.5" value={s.weight}
                          onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'weight', e.target.value)}
                          style={inputStyle} disabled={s.completed}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Reps</label>
                        <input
                          type="number" value={s.reps}
                          onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'reps', e.target.value)}
                          style={inputStyle} disabled={s.completed}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Duración (seg)</label>
                      <input
                        type="number" value={s.duration}
                        onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'duration', e.target.value)}
                        style={inputStyle} disabled={s.completed}
                      />
                    </div>
                  )}
                  {!s.completed ? (
                    <button
                      type="button"
                      onClick={() => markSetComplete(ex.clientPlanDayExerciseId, idx, ex)}
                      style={{
                        padding: '8px 12px', backgroundColor: T.lime, border: 'none',
                        borderRadius: 8, color: '#0A0A0A', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ✓ Listo
                    </button>
                  ) : (
                    <span style={{ fontSize: 16, color: T.lime }}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 13, color: '#F25252', textAlign: 'center' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleFinish}
        disabled={isPending}
        style={{
          padding: '14px 0', backgroundColor: T.lime, border: 'none',
          borderRadius: 12, color: '#0A0A0A', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Guardando...' : 'Finalizar sesión'}
      </button>
    </div>
  )
}
```

---

## Task 5: Página de carga retroactiva

**Files:**
- Create: `src/app/(client)/client/history/week/[weekNumber]/log/[clientPlanDayId]/page.tsx`

- [ ] **Step 1: Crear la página**

```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLogSessionData } from './queries'
import LogSessionClient from './log-session-client'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const T = { bg: '#0A0A0A', border: '#1F2227', text: '#F0F0F0', muted: '#6B7280' } as const

export default async function LogSessionPage({
  params,
}: {
  params: Promise<{ weekNumber: string; clientPlanDayId: string }>
}) {
  const { weekNumber: wn, clientPlanDayId } = await params
  const weekNumber = parseInt(wn, 10)

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const data = await getLogSessionData(clientPlanDayId, user.id)
  if (!data) notFound()

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <a
          href={`/client/history/week/${weekNumber}`}
          style={{ color: T.muted, textDecoration: 'none', fontSize: 20 }}
        >
          ←
        </a>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>
            Registrar entrenamiento
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>
            Semana {weekNumber} · {DAY_NAMES[data.dayOfWeek]}
          </p>
        </div>
      </div>

      <LogSessionClient
        clientPlanDayId={clientPlanDayId}
        weekNumber={weekNumber}
        initialSessionId={data.existingSessionId}
        exercises={data.exercises}
      />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add "src/app/(client)/client/history/week/[weekNumber]/log/"
git commit -m "feat(client): add retroactive session logging from history page"
```

---

## Verificación final del Plan 3

- [ ] Cliente abre `/client/history/week/1` → ve días de entrenamiento sin completar con botón "Registrar"
- [ ] Click en "Registrar" → abre `/client/history/week/1/log/[id]` con los ejercicios del día
- [ ] Completa sets con pesos y reps → click "✓ Listo" por cada serie → click "Finalizar sesión"
- [ ] Redirecciona al historial de esa semana → el día ahora aparece como completado

```bash
npx tsc --noEmit
```

Expected: 0 errores
