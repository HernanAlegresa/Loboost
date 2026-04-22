# Plan 1 — Vista detalle del plan + Coach ve sesiones del cliente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Hacer que `/coach/library/plans/[id]` muestre los ejercicios organizados por semana. (B) Crear la vista donde el coach puede ver todas las sesiones de un cliente con sets, pesos, RPE y notas.

**Architecture:** 
- (A) Ampliar `getPlanDetailForCoach` en `src/app/(coach)/coach/library/plans/queries.ts` para que traiga `plan_weeks → plan_days → plan_day_exercises → exercises`. Renderizar en `page.tsx` con semana como agrupador.
- (B) Nueva ruta `/coach/clients/[id]/sessions` con query que trae `sessions + session_sets` del cliente. Nueva ruta `/coach/clients/[id]/sessions/[sessionId]` para el detalle de una sesión.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, inline styles, Lucide React

---

## Archivos involucrados

### Tarea A — Fix plan detail
- Modify: `src/app/(coach)/coach/library/plans/queries.ts` (ampliar `getPlanDetailForCoach` y agregar tipo `PlanDetailFull`)
- Modify: `src/app/(coach)/coach/library/plans/[id]/page.tsx` (renderizar ejercicios por semana)

### Tarea B — Coach ve sesiones del cliente
- Create: `src/app/(coach)/coach/clients/[id]/sessions/page.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/sessions/queries.ts`
- Create: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/queries.ts`

---

## Task 1: Ampliar la query del detalle del plan

**Files:**
- Modify: `src/app/(coach)/coach/library/plans/queries.ts`

- [ ] **Step 1: Agregar el nuevo tipo `PlanDetailFull` y la nueva query al final del archivo**

Agregar al final de `src/app/(coach)/coach/library/plans/queries.ts` (después de `getPlanForBuilderEdit`):

```typescript
export type PlanDetailExercise = {
  id: string
  name: string
  type: 'strength' | 'cardio'
  order: number
  sets: number
  repsMin: number | null
  repsMax: number | null
  durationSeconds: number | null
  restSeconds: number | null
}

export type PlanDetailDay = {
  id: string
  dayOfWeek: number
  order: number
  exercises: PlanDetailExercise[]
}

export type PlanDetailWeek = {
  id: string
  weekNumber: number
  weekName: string | null
  weekType: string
  days: PlanDetailDay[]
}

export type PlanDetailFull = {
  id: string
  name: string
  description: string | null
  weeks: number
  planWeeks: PlanDetailWeek[]
}

export async function getPlanDetailFull(
  coachId: string,
  planId: string
): Promise<PlanDetailFull | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select(`
      id, name, description, weeks,
      plan_weeks (
        id, week_number, week_name, week_type,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds,
            exercises ( id, name, type )
          )
        )
      )
    `)
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null

  type RawWeek = {
    id: string
    week_number: number
    week_name: string | null
    week_type: string
    plan_days: Array<{
      id: string
      day_of_week: number
      order: number
      plan_day_exercises: Array<{
        id: string
        order: number
        sets: number
        reps_min: number | null
        reps_max: number | null
        duration_seconds: number | null
        rest_seconds: number | null
        exercises: { id: string; name: string; type: string } | null
      }>
    }>
  }

  const planWeeks: PlanDetailWeek[] = ((data.plan_weeks as RawWeek[]) ?? [])
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => ({
      id: w.id,
      weekNumber: w.week_number,
      weekName: w.week_name,
      weekType: w.week_type,
      days: (w.plan_days ?? [])
        .sort((a, b) => a.order - b.order)
        .map((d) => ({
          id: d.id,
          dayOfWeek: d.day_of_week,
          order: d.order,
          exercises: (d.plan_day_exercises ?? [])
            .sort((a, b) => a.order - b.order)
            .map((e) => ({
              id: e.id,
              name: e.exercises?.name ?? 'Ejercicio',
              type: (e.exercises?.type ?? 'strength') as 'strength' | 'cardio',
              order: e.order,
              sets: e.sets,
              repsMin: e.reps_min,
              repsMax: e.reps_max,
              durationSeconds: e.duration_seconds,
              restSeconds: e.rest_seconds,
            })),
        })),
    }))

  return { id: data.id, name: data.name, description: data.description, weeks: data.weeks, planWeeks }
}
```

- [ ] **Step 2: Verificar que el archivo compila**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores relacionados a `queries.ts`

---

## Task 2: Reemplazar el render de la página de detalle del plan

**Files:**
- Modify: `src/app/(coach)/coach/library/plans/[id]/page.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Pencil, UserPlus } from 'lucide-react'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getPlanDetailFull } from '../queries'
import type { PlanDetailFull, PlanDetailWeek } from '../queries'

type Props = { params: Promise<{ id: string }> }

const T = {
  bg: '#0A0A0A',
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const WEEK_TYPE_LABEL: Record<string, string> = {
  normal: 'Normal',
  deload: 'Deload',
  peak: 'Peak',
  test: 'Test',
}

function repsLabel(repsMin: number | null, repsMax: number | null): string {
  if (repsMin == null) return ''
  if (repsMax != null && repsMax !== repsMin) return `${repsMin}–${repsMax} reps`
  return `${repsMin} reps`
}

function WeekCard({ week }: { week: PlanDetailWeek }) {
  return (
    <div
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>
          Semana {week.weekNumber}
          {week.weekName ? ` — ${week.weekName}` : ''}
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.lime,
            backgroundColor: 'rgba(181,242,61,0.1)',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {WEEK_TYPE_LABEL[week.weekType] ?? week.weekType}
        </span>
      </div>

      {week.days.length === 0 ? (
        <p style={{ padding: '12px 16px', fontSize: 13, color: T.muted, margin: 0 }}>Sin días configurados</p>
      ) : (
        week.days.map((day) => (
          <div
            key={day.id}
            style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.05em' }}>
              {DAY_NAMES[day.dayOfWeek]}
            </p>
            {day.exercises.map((ex) => (
              <div
                key={ex.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: `1px solid rgba(31,34,39,0.5)`,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: T.text }}>{ex.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: T.secondary }}>
                  {ex.sets} × {ex.type === 'cardio' ? `${ex.durationSeconds}s` : repsLabel(ex.repsMin, ex.repsMax)}
                </p>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

const btnPrimary: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', minHeight: 50, borderRadius: 12, border: 'none',
  fontSize: 15, fontWeight: 700, color: '#0A0A0A', backgroundColor: '#B5F23D',
  textDecoration: 'none', cursor: 'pointer',
}

const btnSecondary: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', minHeight: 50, borderRadius: 12, border: '1px solid #2A2D34',
  fontSize: 15, fontWeight: 600, color: '#F0F0F0', backgroundColor: '#111317',
  textDecoration: 'none', cursor: 'pointer',
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const plan = await getPlanDetailFull(user.id, id)
  if (!plan) notFound()

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref="/coach/library?tab=plans"
        title={plan.name}
        titleColor="#B5F23D"
        subtitle={`${plan.weeks} ${plan.weeks === 1 ? 'semana' : 'semanas'}`}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', padding: '16px 20px 120px' }}>
        {plan.description && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: T.secondary, margin: 0, lineHeight: 1.5 }}>{plan.description}</p>
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>ACCIONES</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          <Link href={`/coach/library/plans/${plan.id}/edit`} style={btnPrimary}>
            <Pencil size={18} color="#0A0A0A" /> Editar plan
          </Link>
          <Link href={`/coach/library/plans/${plan.id}/assign`} style={btnSecondary}>
            <UserPlus size={18} color="#B5F23D" /> Asignar a un cliente
          </Link>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>ESTRUCTURA DEL PLAN</p>
        {plan.planWeeks.map((week) => (
          <WeekCard key={week.id} week={week} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores en `plans/[id]/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/library/plans/queries.ts src/app/\(coach\)/coach/library/plans/\[id\]/page.tsx
git commit -m "feat(coach): plan detail page shows exercises organized by week"
```

---

## Task 3: Query — lista de sesiones del cliente para el coach

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/sessions/queries.ts`

- [ ] **Step 1: Crear el archivo de queries**

```typescript
import { createClient } from '@/lib/supabase/server'

export type ClientSessionListItem = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  rpe: number | null
  notes: string | null
  dayOfWeek: number
  weekNumber: number
  exerciseCount: number
  completedSets: number
}

export async function getClientSessionsForCoach(
  clientId: string,
  coachId: string
): Promise<ClientSessionListItem[] | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()

  if (!profile || profile.coach_id !== coachId) return null

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id, date, status, rpe, notes,
      client_plan_days ( day_of_week, week_number )
    `)
    .eq('client_id', clientId)
    .in('status', ['completed', 'in_progress'])
    .order('date', { ascending: false })
    .limit(60)

  if (error || !sessions) return []

  const sessionIds = sessions.map((s) => s.id)
  let setsData: Array<{ session_id: string; completed: boolean; client_plan_day_exercise_id: string }> = []

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select('session_id, completed, client_plan_day_exercise_id')
      .in('session_id', sessionIds)
    setsData = data ?? []
  }

  const setsBySession = new Map<string, typeof setsData>()
  for (const s of setsData) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, [])
    setsBySession.get(s.session_id)!.push(s)
  }

  type RawSession = typeof sessions[number]
  type RawDay = { day_of_week: number; week_number: number } | null

  return sessions.map((sess: RawSession) => {
    const day = sess.client_plan_days as RawDay
    const sets = setsBySession.get(sess.id) ?? []
    const exerciseIds = new Set(sets.map((s) => s.client_plan_day_exercise_id))
    return {
      id: sess.id,
      date: sess.date,
      status: sess.status as 'completed' | 'in_progress',
      rpe: sess.rpe,
      notes: sess.notes,
      dayOfWeek: day?.day_of_week ?? 0,
      weekNumber: day?.week_number ?? 0,
      exerciseCount: exerciseIds.size,
      completedSets: sets.filter((s) => s.completed).length,
    }
  })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 4: Página — lista de sesiones del cliente

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/sessions/page.tsx`

- [ ] **Step 1: Crear la página**

```typescript
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getClientSessionsForCoach } from './queries'
import type { ClientSessionListItem } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function SessionRow({ session, clientId }: { session: ClientSessionListItem; clientId: string }) {
  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Link
      href={`/coach/clients/${clientId}/sessions/${session.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
            Semana {session.weekNumber} · {DAY_NAMES[session.dayOfWeek]}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>{date}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {session.rpe != null && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.lime }}>RPE {session.rpe}</p>
          )}
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.secondary }}>
            {session.exerciseCount} ejerc · {session.completedSets} series
          </p>
        </div>
      </div>
      {session.notes && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: T.secondary, fontStyle: 'italic', lineHeight: 1.4 }}>
          "{session.notes}"
        </p>
      )}
    </Link>
  )
}

export default async function ClientSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', clientId)
    .single()

  const sessions = await getClientSessionsForCoach(clientId, user.id)
  if (sessions === null) notFound()

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}`}
        title="Sesiones"
        subtitle={clientProfile?.full_name ?? ''}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {sessions.length === 0 ? (
          <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 40 }}>
            Este cliente no tiene sesiones registradas todavía.
          </p>
        ) : (
          sessions.map((s) => <SessionRow key={s.id} session={s} clientId={clientId} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 5: Query — detalle de una sesión

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/queries.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { createClient } from '@/lib/supabase/server'

export type SessionSetDetail = {
  setNumber: number
  weightKg: number | null
  repsPerformed: number | null
  durationSeconds: number | null
  completed: boolean
}

export type SessionExerciseDetail = {
  clientPlanDayExerciseId: string
  name: string
  type: 'strength' | 'cardio'
  plannedSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  sets: SessionSetDetail[]
}

export type SessionDetail = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  rpe: number | null
  notes: string | null
  weekNumber: number
  dayOfWeek: number
  exercises: SessionExerciseDetail[]
}

export async function getSessionDetailForCoach(
  sessionId: string,
  clientId: string,
  coachId: string
): Promise<SessionDetail | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()
  if (!profile || profile.coach_id !== coachId) return null

  const { data: session, error: sessErr } = await supabase
    .from('sessions')
    .select(`
      id, date, status, rpe, notes,
      client_plan_days ( day_of_week, week_number,
        client_plan_day_exercises (
          id, sets, reps_min, reps_max, duration_seconds,
          exercises ( name, type )
        )
      )
    `)
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (sessErr || !session) return null

  const { data: setsData } = await supabase
    .from('session_sets')
    .select('client_plan_day_exercise_id, set_number, weight_kg, reps_performed, duration_seconds, completed')
    .eq('session_id', sessionId)
    .order('set_number')

  const setsByExercise = new Map<string, SessionSetDetail[]>()
  for (const s of setsData ?? []) {
    if (!setsByExercise.has(s.client_plan_day_exercise_id)) {
      setsByExercise.set(s.client_plan_day_exercise_id, [])
    }
    setsByExercise.get(s.client_plan_day_exercise_id)!.push({
      setNumber: s.set_number,
      weightKg: s.weight_kg,
      repsPerformed: s.reps_performed,
      durationSeconds: s.duration_seconds,
      completed: s.completed,
    })
  }

  type RawDay = {
    day_of_week: number
    week_number: number
    client_plan_day_exercises: Array<{
      id: string
      sets: number
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      exercises: { name: string; type: string } | null
    }>
  }

  const day = session.client_plan_days as RawDay | null

  const exercises: SessionExerciseDetail[] = (day?.client_plan_day_exercises ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    name: ex.exercises?.name ?? 'Ejercicio',
    type: (ex.exercises?.type ?? 'strength') as 'strength' | 'cardio',
    plannedSets: ex.sets,
    plannedRepsMin: ex.reps_min,
    plannedRepsMax: ex.reps_max,
    plannedDurationSeconds: ex.duration_seconds,
    sets: setsByExercise.get(ex.id) ?? [],
  }))

  return {
    id: session.id,
    date: session.date,
    status: session.status as 'completed' | 'in_progress',
    rpe: session.rpe,
    notes: session.notes,
    weekNumber: day?.week_number ?? 0,
    dayOfWeek: day?.day_of_week ?? 0,
    exercises,
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 6: Página — detalle de la sesión

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Crear la página de detalle**

```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getSessionDetailForCoach } from './queries'
import type { SessionDetail, SessionExerciseDetail } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function repsRange(min: number | null, max: number | null): string {
  if (min == null) return '—'
  if (max != null && max !== min) return `${min}–${max}`
  return String(min)
}

function ExerciseCard({ ex }: { ex: SessionExerciseDetail }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{ex.name}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
          {ex.plannedSets} series planificadas
          {ex.type === 'strength'
            ? ` · ${repsRange(ex.plannedRepsMin, ex.plannedRepsMax)} reps`
            : ex.plannedDurationSeconds != null
              ? ` · ${ex.plannedDurationSeconds}s`
              : ''}
        </p>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ex.sets.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Sin series registradas</p>
        ) : (
          ex.sets.map((set) => (
            <div
              key={set.setNumber}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px',
                backgroundColor: set.completed ? 'rgba(181,242,61,0.06)' : 'rgba(255,255,255,0.02)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: T.muted, minWidth: 52 }}>Serie {set.setNumber}</span>
              <span style={{ fontSize: 13, color: T.secondary, flex: 1 }}>
                {ex.type === 'strength'
                  ? set.weightKg != null
                    ? `${set.weightKg} kg × ${set.repsPerformed ?? '—'} reps`
                    : `— × ${set.repsPerformed ?? '—'} reps`
                  : set.durationSeconds != null
                    ? `${set.durationSeconds} seg`
                    : '—'}
              </span>
              {set.completed && (
                <span style={{ fontSize: 13, color: T.lime }}>✓</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: clientId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const session = await getSessionDetailForCoach(sessionId, clientId, user.id)
  if (!session) notFound()

  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}/sessions`}
        title={`Semana ${session.weekNumber} · ${DAY_NAMES[session.dayOfWeek]}`}
        subtitle={date}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {/* RPE + Notas */}
        {(session.rpe != null || session.notes) && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            {session.rpe != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: session.notes ? 10 : 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>RPE percibido</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.lime }}>{session.rpe}/10</p>
              </div>
            )}
            {session.notes && (
              <p style={{ margin: 0, fontSize: 13, color: T.secondary, fontStyle: 'italic', lineHeight: 1.5 }}>
                "{session.notes}"
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>EJERCICIOS</p>
        {session.exercises.map((ex) => (
          <ExerciseCard key={ex.clientPlanDayExerciseId} ex={ex} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/coach/clients/\[id\]/sessions/
git commit -m "feat(coach): add client session list and session detail views with RPE and sets"
```

---

## Task 7: Agregar link "Ver sesiones" en el perfil del cliente

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-profile-tabs-shell.tsx` (o el componente que renderiza los tabs del perfil)

- [ ] **Step 1: Leer el archivo actual del shell**

Leer `src/app/(coach)/coach/clients/[id]/client-profile-tabs-shell.tsx` y agregar una tercera tab "Sesiones" que enlace a `/coach/clients/[id]/sessions`.

El patrón a seguir es el de las tabs existentes. Agregar:
```typescript
import Link from 'next/link'
// En el listado de tabs, agregar:
<Link href={`/coach/clients/${clientId}/sessions`}>
  Sesiones
</Link>
```

El `clientId` deberá ser pasado como prop si no lo está ya.

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/\(coach\)/coach/clients/\[id\]/client-profile-tabs-shell.tsx
git commit -m "feat(coach): add Sessions tab in client profile linking to sessions list"
```

---

## Verificación final del Plan 1

- [ ] Navegar a `/coach/library/plans/[algún-id]` — debe mostrar ejercicios por semana
- [ ] Navegar a `/coach/clients/[client-id]/sessions` — debe listar sesiones completadas
- [ ] Click en una sesión — debe mostrar todos los sets, pesos, RPE y notas

```bash
npx tsc --noEmit
```

Expected: 0 errores
