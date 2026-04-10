# Client Profile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/coach/clients/[id]` — the coach's hub for monitoring a client: sticky header, KPI strip, interactive weekly training navigator (the focal point), active plan card, physical profile grid, and coach notes.

**Architecture:** Server Component page fetches all data in parallel via `queries.ts`, passes it as props to child components. The training week navigator is a Client Component that receives the current week as initial props and fetches subsequent weeks via a `'use server'` action when the coach navigates. All other components are Server Components except `coach-notes.tsx` (needs edit state).

**Tech Stack:** Next.js 16 App Router (params is `Promise<{id}>`), React 19 `useTransition`, framer-motion AnimatePresence, lucide-react, Supabase server client, Zod types already defined.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/clients/types.ts` | Modify | Add all new domain types |
| `src/features/clients/utils/training-utils.ts` | Create | Pure functions: `getCurrentWeek`, `computeDayDate`, `computeDayStatus` |
| `src/features/clients/__tests__/training-utils.test.ts` | Create | TDD tests for the 3 pure functions |
| `src/app/(coach)/coach/clients/[id]/queries.ts` | Create | `getClientProfileData` + `getWeekTrainingData` |
| `src/app/(coach)/coach/clients/[id]/actions.ts` | Create | Server Actions: week data fetcher + save note |
| `src/app/(coach)/coach/clients/[id]/kpi-strip.tsx` | Create | 3 KPI cards (compliance, last session, total) |
| `src/app/(coach)/coach/clients/[id]/plan-card.tsx` | Create | Active plan name, progress bar, dates |
| `src/app/(coach)/coach/clients/[id]/physical-profile.tsx` | Create | 2-col grid of fitness data chips |
| `src/app/(coach)/coach/clients/[id]/client-profile-header.tsx` | Create | Header with avatar, name, goal, status badge |
| `src/app/(coach)/coach/clients/[id]/coach-notes.tsx` | Create | View/edit coach note with optimistic update |
| `src/app/(coach)/coach/clients/[id]/training-week.tsx` | Create | Week navigator + day strip + day detail |
| `src/app/(coach)/coach/clients/[id]/page.tsx` | Create | Server Component shell, orchestrates all above |

---

### Task 1: Types + training utility functions (TDD)

**Files:**
- Modify: `src/features/clients/types.ts`
- Create: `src/features/clients/utils/training-utils.ts`
- Create: `src/features/clients/__tests__/training-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/clients/__tests__/training-utils.test.ts`:

```typescript
import { getCurrentWeek, computeDayDate, computeDayStatus } from '../utils/training-utils'

describe('getCurrentWeek', () => {
  it('returns 1 when today is before start date', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    expect(getCurrentWeek(future, 8)).toBe(1)
  })

  it('returns 1 on the start date itself', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(getCurrentWeek(today, 8)).toBe(1)
  })

  it('returns 2 after 7 days', () => {
    const start = new Date(Date.now() - 7 * 86400000)
    start.setHours(0, 0, 0, 0)
    expect(getCurrentWeek(start.toISOString().split('T')[0], 8)).toBe(2)
  })

  it('caps at totalWeeks when plan has ended', () => {
    expect(getCurrentWeek('2020-01-01', 4)).toBe(4)
  })

  it('returns 1 on day 6 of the plan (still week 1)', () => {
    const start = new Date(Date.now() - 6 * 86400000)
    start.setHours(0, 0, 0, 0)
    expect(getCurrentWeek(start.toISOString().split('T')[0], 8)).toBe(1)
  })
})

describe('computeDayDate', () => {
  it('returns start date for week 1 day 1', () => {
    expect(computeDayDate('2026-04-13', 1, 1)).toBe('2026-04-13')
  })

  it('returns correct date for week 1 day 3 (Wednesday)', () => {
    expect(computeDayDate('2026-04-13', 1, 3)).toBe('2026-04-15')
  })

  it('returns correct date for week 2 day 1 (Monday)', () => {
    expect(computeDayDate('2026-04-13', 2, 1)).toBe('2026-04-20')
  })

  it('returns correct date for week 3 day 7 (Sunday)', () => {
    expect(computeDayDate('2026-04-13', 3, 7)).toBe('2026-05-03')
  })
})

describe('computeDayStatus', () => {
  it('returns completed when session is completed', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'completed')).toBe('completed')
  })

  it('returns in_progress when session is in_progress', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'in_progress')).toBe('in_progress')
  })

  it('returns today when date is today and no session', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', null)).toBe('today')
  })

  it('returns upcoming for future date with no session', () => {
    expect(computeDayStatus('2026-04-20', '2026-04-10', null)).toBe('upcoming')
  })

  it('returns past_missed for past date with no session', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', null)).toBe('past_missed')
  })

  it('completed status takes priority even for past date', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', 'completed')).toBe('completed')
  })
})
```

- [ ] **Step 2: Run — expect FAIL (modules not found)**

```bash
cd "C:\Users\herna\Loboost App"
npx jest src/features/clients/__tests__/training-utils.test.ts --no-coverage
```

Expected: FAIL with "Cannot find module '../utils/training-utils'"

- [ ] **Step 3: Add types to `src/features/clients/types.ts`**

Replace the full content:

```typescript
export type CreateClientState =
  | { success: true; clientId: string; clientName: string }
  | { success: false; error: string }
  | null

// ── Training week types ────────────────────────────────────────────────────

export type SessionSetData = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type ExerciseWithSets = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  sessionSets: SessionSetData[]
}

export type DayStatus =
  | 'completed'
  | 'in_progress'
  | 'today'
  | 'upcoming'
  | 'past_missed'
  | 'rest'

export type DayTrainingData = {
  dayOfWeek: number           // 1=Mon … 7=Sun
  date: string                // ISO 'YYYY-MM-DD'
  status: DayStatus
  clientPlanDayId: string | null
  sessionId: string | null
  exercises: ExerciseWithSets[]
}

export type TrainingWeekData = {
  weekNumber: number
  totalWeeks: number
  days: DayTrainingData[]     // always 7 items
}

// ── Client profile types ───────────────────────────────────────────────────

export type ActivePlanSummary = {
  id: string
  name: string
  weeks: number
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'paused'
  currentWeek: number
}

export type ClientProfileData = {
  id: string
  fullName: string
  goal: string | null
  statusColor: 'active' | 'warning' | 'critical'
  weeklyCompliance: number
  daysSinceLastSession: number | null
  totalSessions: number
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  injuries: string | null
  activePlan: ActivePlanSummary | null
  currentWeekData: TrainingWeekData | null
  coachNote: string
}
```

- [ ] **Step 4: Create `src/features/clients/utils/training-utils.ts`**

```typescript
import type { DayStatus } from '../types'

/**
 * Returns the 1-indexed week number for today given a plan's start date.
 * Returns 1 if today < startDate. Capped at totalWeeks.
 */
export function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const start = new Date(startDate)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  start.setUTCHours(0, 0, 0, 0)
  if (today <= start) return 1
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}

/**
 * Computes the ISO date string (YYYY-MM-DD) for a plan day.
 * week 1 day 1 = startDate, week 1 day 2 = startDate + 1, etc.
 * dayOfWeek: 1=Monday … 7=Sunday
 */
export function computeDayDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  const offsetDays = (weekNumber - 1) * 7 + (dayOfWeek - 1)
  const d = new Date(start.getTime() + offsetDays * 86400000)
  return d.toISOString().split('T')[0]
}

/**
 * Determines display status of a training day.
 * sessionStatus takes priority over date comparison.
 */
export function computeDayStatus(
  dateISO: string,
  todayISO: string,
  sessionStatus: 'in_progress' | 'completed' | null
): DayStatus {
  if (sessionStatus === 'completed') return 'completed'
  if (sessionStatus === 'in_progress') return 'in_progress'
  if (dateISO === todayISO) return 'today'
  if (dateISO > todayISO) return 'upcoming'
  return 'past_missed'
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest src/features/clients/__tests__/training-utils.test.ts --no-coverage
```

Expected: 15 tests pass.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/clients/types.ts src/features/clients/utils/training-utils.ts src/features/clients/__tests__/training-utils.test.ts
git commit -m "feat: add client profile types and training utility functions (TDD)"
```

---

### Task 2: Page queries

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/queries.ts`

- [ ] **Step 1: Create the file**

Create `src/app/(coach)/coach/clients/[id]/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import { getCurrentWeek, computeDayDate, computeDayStatus } from '@/features/clients/utils/training-utils'
import type {
  ClientProfileData,
  ActivePlanSummary,
  TrainingWeekData,
  DayTrainingData,
  ExerciseWithSets,
  SessionSetData,
  DayStatus,
} from '@/features/clients/types'

// ── getClientProfileData ───────────────────────────────────────────────────

export async function getClientProfileData(
  clientId: string,
  coachId: string
): Promise<ClientProfileData | null> {
  const supabase = await createClient()

  const [
    profileResult,
    cpResult,
    planResult,
    recentSessionsResult,
    totalSessionsResult,
    noteResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, coach_id')
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_profiles')
      .select('age, sex, goal, weight_kg, height_cm, experience_level, days_per_week, injuries')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 14 * 86400000).toISOString())
      .order('completed_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed'),
    supabase
      .from('coach_notes')
      .select('content')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Security: client must belong to this coach
  if (!profileResult.data || profileResult.data.coach_id !== coachId) return null

  const cp = cpResult.data
  const plan = planResult.data
  const recentSessions = recentSessionsResult.data ?? []
  const totalSessions = totalSessionsResult.count ?? 0
  const coachNote = noteResult.data?.content ?? ''
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 86400000
  const daysPerWeek = cp?.days_per_week ?? 3

  // Last session + compliance
  const mostRecent = recentSessions[0]
  const lastSessionDate = mostRecent?.completed_at ? new Date(mostRecent.completed_at) : null
  const daysSinceLastSession = lastSessionDate
    ? Math.floor((now - lastSessionDate.getTime()) / 86400000)
    : null
  const completedInLastWeek = recentSessions.filter(
    s => s.completed_at && new Date(s.completed_at).getTime() >= sevenDaysAgo
  ).length
  const weeklyCompliance = calculateWeeklyCompliance({
    expectedDays: daysPerWeek,
    completedDays: completedInLastWeek,
  })

  // Status color
  const hasActivePlan = plan !== null
  let statusColor: 'active' | 'warning' | 'critical'
  if (!hasActivePlan || (daysSinceLastSession !== null && daysSinceLastSession > 7)) {
    statusColor = 'critical'
  } else if (daysSinceLastSession !== null && daysSinceLastSession > 3) {
    statusColor = 'warning'
  } else {
    statusColor = 'active'
  }

  // Active plan summary
  let activePlan: ActivePlanSummary | null = null
  if (plan) {
    activePlan = {
      id: plan.id,
      name: plan.name,
      weeks: plan.weeks,
      startDate: plan.start_date,
      endDate: plan.end_date,
      status: plan.status as 'active' | 'completed' | 'paused',
      currentWeek: getCurrentWeek(plan.start_date, plan.weeks),
    }
  }

  // Current week training data
  let currentWeekData: TrainingWeekData | null = null
  if (activePlan) {
    currentWeekData = await getWeekTrainingData(
      activePlan.id,
      activePlan.currentWeek,
      activePlan.startDate,
      activePlan.weeks,
      clientId
    )
  }

  return {
    id: clientId,
    fullName: profileResult.data.full_name ?? 'Sin nombre',
    goal: cp?.goal ?? null,
    statusColor,
    weeklyCompliance,
    daysSinceLastSession,
    totalSessions,
    age: cp?.age ?? null,
    sex: (cp?.sex as 'male' | 'female' | 'other' | null) ?? null,
    weightKg: cp?.weight_kg != null ? Number(cp.weight_kg) : null,
    heightCm: cp?.height_cm != null ? Number(cp.height_cm) : null,
    experienceLevel: (cp?.experience_level as 'beginner' | 'intermediate' | 'advanced' | null) ?? null,
    daysPerWeek,
    injuries: cp?.injuries ?? null,
    activePlan,
    currentWeekData,
    coachNote,
  }
}

// ── getWeekTrainingData ────────────────────────────────────────────────────

export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number,
  clientId: string
): Promise<TrainingWeekData> {
  const supabase = await createClient()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayISO = today.toISOString().split('T')[0]

  // Plan days for this week
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week, order')
    .eq('client_plan_id', clientPlanId)
    .eq('week_number', weekNumber)
    .order('order')

  if (!planDays || planDays.length === 0) {
    const days: DayTrainingData[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
      dayOfWeek: dow,
      date: computeDayDate(startDate, weekNumber, dow),
      status: 'rest' as DayStatus,
      clientPlanDayId: null,
      sessionId: null,
      exercises: [],
    }))
    return { weekNumber, totalWeeks, days }
  }

  const planDayIds = planDays.map((d) => d.id)

  // Parallel: exercises (with exercise name) + sessions
  const [exercisesResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select('id, client_plan_day_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name)')
      .in('client_plan_day_id', planDayIds)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .in('client_plan_day_id', planDayIds),
  ])

  // Session sets (only for sessions that exist)
  const sessionIds = (sessionsResult.data ?? []).map((s) => s.id)
  let allSets: Array<{
    session_id: string
    client_plan_day_exercise_id: string
    set_number: number
    weight_kg: number | null
    duration_seconds: number | null
    completed: boolean
  }> = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select('session_id, client_plan_day_exercise_id, set_number, weight_kg, duration_seconds, completed')
      .in('session_id', sessionIds)
      .order('set_number')
    allSets = data ?? []
  }

  // Index: session by plan_day_id
  const sessionByDayId = new Map(
    (sessionsResult.data ?? []).map((s) => [s.client_plan_day_id, s])
  )

  // Index: sets by "sessionId:exerciseId"
  const setsByKey = new Map<string, SessionSetData[]>()
  for (const set of allSets) {
    const key = `${set.session_id}:${set.client_plan_day_exercise_id}`
    if (!setsByKey.has(key)) setsByKey.set(key, [])
    setsByKey.get(key)!.push({
      setNumber: set.set_number,
      weightKg: set.weight_kg,
      durationSeconds: set.duration_seconds,
      completed: set.completed,
    })
  }

  // Index: exercises by plan_day_id
  const exercisesByDayId = new Map<string, ExerciseWithSets[]>()
  for (const ex of exercisesResult.data ?? []) {
    const dayId = ex.client_plan_day_id
    const session = sessionByDayId.get(dayId)
    const sets = session ? (setsByKey.get(`${session.id}:${ex.id}`) ?? []) : []
    const exerciseRef = ex.exercises as { id: string; name: string } | null
    if (!exercisesByDayId.has(dayId)) exercisesByDayId.set(dayId, [])
    exercisesByDayId.get(dayId)!.push({
      clientPlanDayExerciseId: ex.id,
      exerciseId: exerciseRef?.id ?? '',
      name: exerciseRef?.name ?? 'Ejercicio',
      order: ex.order,
      plannedSets: ex.sets,
      plannedReps: ex.reps ?? null,
      plannedDurationSeconds: ex.duration_seconds ?? null,
      restSeconds: ex.rest_seconds ?? null,
      sessionSets: sets,
    })
  }

  // Build 7-element days array
  const planDayByDow = new Map(planDays.map((d) => [d.day_of_week, d]))

  const days: DayTrainingData[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => {
    const dateStr = computeDayDate(startDate, weekNumber, dow)
    const planDay = planDayByDow.get(dow)
    if (!planDay) {
      return {
        dayOfWeek: dow,
        date: dateStr,
        status: 'rest' as DayStatus,
        clientPlanDayId: null,
        sessionId: null,
        exercises: [],
      }
    }
    const session = sessionByDayId.get(planDay.id) ?? null
    const exercises = exercisesByDayId.get(planDay.id) ?? []
    const status = computeDayStatus(
      dateStr,
      todayISO,
      (session?.status as 'completed' | 'in_progress' | null) ?? null
    )
    return {
      dayOfWeek: dow,
      date: dateStr,
      status,
      clientPlanDayId: planDay.id,
      sessionId: session?.id ?? null,
      exercises,
    }
  })

  return { weekNumber, totalWeeks, days }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/queries.ts"
git commit -m "feat: add client profile queries — getClientProfileData + getWeekTrainingData"
```

---

### Task 3: Server Actions

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/actions.ts`

- [ ] **Step 1: Create the file**

Create `src/app/(coach)/coach/clients/[id]/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getWeekTrainingData as _getWeekTrainingData } from './queries'
import type { TrainingWeekData } from '@/features/clients/types'

/**
 * Server Action wrapper so training-week.tsx can fetch week data client-side
 * during week navigation.
 */
export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number,
  clientId: string
): Promise<TrainingWeekData> {
  return _getWeekTrainingData(clientPlanId, weekNumber, startDate, totalWeeks, clientId)
}

/**
 * Create or update the coach's single note for a client.
 * coach_notes has no UNIQUE constraint, so we enforce one-per-pair at app level:
 * fetch the most recent note → update if found, insert if not.
 */
export async function saveCoachNoteAction(
  clientId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data: existing } = await supabase
    .from('coach_notes')
    .select('id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('coach_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { success: false, error: 'Error al guardar la nota' }
  } else {
    const { error } = await supabase
      .from('coach_notes')
      .insert({ coach_id: user.id, client_id: clientId, content })
    if (error) return { success: false, error: 'Error al guardar la nota' }
  }

  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/actions.ts"
git commit -m "feat: add client profile server actions — week data fetcher + save coach note"
```

---

### Task 4: Static server components (KPI strip, Plan card, Physical profile)

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/kpi-strip.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/plan-card.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/physical-profile.tsx`

- [ ] **Step 1: Create `kpi-strip.tsx`**

Create `src/app/(coach)/coach/clients/[id]/kpi-strip.tsx`:

```typescript
type Props = {
  weeklyCompliance: number
  daysSinceLastSession: number | null
  totalSessions: number
}

function complianceColor(v: number): string {
  if (v >= 70) return '#B5F23D'
  if (v >= 40) return '#F2994A'
  return '#F25252'
}

function lastSessionValue(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

function KpiCard({
  label,
  value,
  valueColor = '#F0F0F0',
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {value}
      </p>
    </div>
  )
}

export default function KpiStrip({
  weeklyCompliance,
  daysSinceLastSession,
  totalSessions,
}: Props) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <KpiCard
        label="Cumplimiento"
        value={`${weeklyCompliance}%`}
        valueColor={complianceColor(weeklyCompliance)}
      />
      <KpiCard
        label="Últ. sesión"
        value={lastSessionValue(daysSinceLastSession)}
        valueColor={daysSinceLastSession === null ? '#4B5563' : '#F0F0F0'}
      />
      <KpiCard label="Sesiones" value={totalSessions} />
    </div>
  )
}
```

- [ ] **Step 2: Create `plan-card.tsx`**

Create `src/app/(coach)/coach/clients/[id]/plan-card.tsx`:

```typescript
import type { ActivePlanSummary } from '@/features/clients/types'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#B5F23D',
  completed: '#6B7280',
  paused: '#F2994A',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

export default function PlanCard({ activePlan }: { activePlan: ActivePlanSummary | null }) {
  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  if (!activePlan) {
    return (
      <div>
        <p style={SECTION_TITLE}>Plan activo</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}>
            Sin plan asignado
          </p>
          <button
            disabled
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#4B5563',
              backgroundColor: 'transparent',
              border: '1px solid #2A2D34',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'not-allowed',
            }}
          >
            + Asignar plan
          </button>
        </div>
      </div>
    )
  }

  const progressPct = Math.max(
    8,
    Math.round(((activePlan.currentWeek - 1) / activePlan.weeks) * 100)
  )
  const statusColor = STATUS_COLORS[activePlan.status] ?? '#6B7280'

  return (
    <div>
      <p style={SECTION_TITLE}>Plan activo</p>
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: 16,
        }}
      >
        {/* Name + status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {activePlan.name}
          </p>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              color: statusColor,
              backgroundColor: `${statusColor}1A`,
              padding: '3px 8px',
              borderRadius: 9999,
            }}
          >
            {STATUS_LABELS[activePlan.status] ?? activePlan.status}
          </span>
        </div>

        {/* Week + dates */}
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
          Semana {activePlan.currentWeek} de {activePlan.weeks}
          {' · '}
          {formatDate(activePlan.startDate)} → {formatDate(activePlan.endDate)}
        </p>

        {/* Progress bar */}
        <div
          style={{
            backgroundColor: '#1F2227',
            borderRadius: 9999,
            height: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: '#B5F23D',
              borderRadius: 9999,
            }}
          />
        </div>
        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'right' }}>
          {progressPct}%
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `physical-profile.tsx`**

Create `src/app/(coach)/coach/clients/[id]/physical-profile.tsx`:

```typescript
import { Calendar, User, Scale, Ruler, Dumbbell, CalendarDays, AlertTriangle } from 'lucide-react'

const SEX_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
}
const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const CARD: React.CSSProperties = {
  backgroundColor: '#111317',
  border: '1px solid #1F2227',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
}

type Props = {
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  injuries: string | null
}

export default function PhysicalProfile({
  age,
  sex,
  weightKg,
  heightCm,
  experienceLevel,
  daysPerWeek,
  injuries,
}: Props) {
  const items = [
    { icon: <Calendar size={16} />, label: 'Edad', value: age ? `${age} años` : '—' },
    { icon: <User size={16} />, label: 'Sexo', value: sex ? SEX_LABELS[sex] : '—' },
    { icon: <Scale size={16} />, label: 'Peso', value: weightKg ? `${weightKg} kg` : '—' },
    { icon: <Ruler size={16} />, label: 'Altura', value: heightCm ? `${heightCm} cm` : '—' },
    {
      icon: <Dumbbell size={16} />,
      label: 'Nivel',
      value: experienceLevel ? EXPERIENCE_LABELS[experienceLevel] : '—',
    },
    { icon: <CalendarDays size={16} />, label: 'Días/sem', value: `${daysPerWeek} días` },
  ]

  return (
    <div>
      <p style={SECTION_TITLE}>Perfil físico</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((item) => (
          <div key={item.label} style={CARD}>
            <span style={{ color: '#6B7280', flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 3 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {injuries && (
        <div style={{ ...CARD, marginTop: 8 }}>
          <span style={{ color: '#F2994A', flexShrink: 0, marginTop: 2 }}>
            <AlertTriangle size={16} />
          </span>
          <div>
            <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 3 }}>
              Lesiones / limitaciones
            </p>
            <p style={{ fontSize: 14, color: '#F0F0F0' }}>{injuries}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/kpi-strip.tsx" "src/app/(coach)/coach/clients/[id]/plan-card.tsx" "src/app/(coach)/coach/clients/[id]/physical-profile.tsx"
git commit -m "feat: add client profile static components — kpi-strip, plan-card, physical-profile"
```

---

### Task 5: Client profile header + coach notes

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/client-profile-header.tsx`
- Create: `src/app/(coach)/coach/clients/[id]/coach-notes.tsx`

- [ ] **Step 1: Create `client-profile-header.tsx`**

This is a Server Component (no interactivity needed).

Create `src/app/(coach)/coach/clients/[id]/client-profile-header.tsx`:

```typescript
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import Avatar from '@/components/ui/avatar'

const STATUS_CONFIG = {
  active:   { label: 'Activo',   color: '#B5F23D' },
  warning:  { label: 'Atención', color: '#F2994A' },
  critical: { label: 'Inactivo', color: '#F25252' },
} as const

type Props = {
  fullName: string
  goal: string | null
  statusColor: 'active' | 'warning' | 'critical'
}

export default function ClientProfileHeader({ fullName, goal, statusColor }: Props) {
  const { label, color } = STATUS_CONFIG[statusColor]

  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        borderBottom: '1px solid #1F2227',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}
    >
      <Link
        href="/coach/clients"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#6B7280',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={22} />
      </Link>

      <Avatar fullName={fullName} size="md" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#F0F0F0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fullName}
        </p>
        {goal && (
          <p
            style={{
              fontSize: 12,
              color: '#6B7280',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {goal}
          </p>
        )}
      </div>

      <span
        style={{
          flexShrink: 0,
          backgroundColor: `${color}1A`,
          color,
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 9999,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `coach-notes.tsx`**

Create `src/app/(coach)/coach/clients/[id]/coach-notes.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { saveCoachNoteAction } from './actions'

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

type Props = {
  clientId: string
  initialNote: string
}

export default function CoachNotes({ clientId, initialNote }: Props) {
  const [savedNote, setSavedNote] = useState(initialNote)
  const [draft, setDraft] = useState(initialNote)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveCoachNoteAction(clientId, draft)
      if (result.success) {
        setSavedNote(draft)
        setEditing(false)
        setError(null)
      } else {
        setError(result.error ?? 'Error al guardar')
      }
    })
  }

  function handleCancel() {
    setDraft(savedNote)
    setEditing(false)
    setError(null)
  }

  return (
    <div>
      <p style={SECTION_TITLE}>Notas internas</p>

      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribí tus notas sobre este cliente..."
              style={{
                width: '100%',
                minHeight: 100,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F0F0F0',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ fontSize: 12, color: '#F25252', marginTop: 8 }}>{error}</p>
            )}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 12px',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A0A0A',
                  backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  padding: '6px 16px',
                }}
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: savedNote ? '#F0F0F0' : '#4B5563',
                lineHeight: 1.6,
                flex: 1,
                fontStyle: savedNote ? 'normal' : 'italic',
              }}
            >
              {savedNote || 'Sin notas. Tocá Editar para agregar.'}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#B5F23D',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                padding: '2px 0',
              }}
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/client-profile-header.tsx" "src/app/(coach)/coach/clients/[id]/coach-notes.tsx"
git commit -m "feat: add client-profile-header and coach-notes components"
```

---

### Task 6: Training Week component

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/training-week.tsx`

This is the focal component of the screen. It manages week navigation state, dispatches server action calls, renders the day pill strip, and animates day detail.

- [ ] **Step 1: Create `training-week.tsx`**

Create `src/app/(coach)/coach/clients/[id]/training-week.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react'
import { getWeekTrainingData } from './actions'
import type { TrainingWeekData, DayTrainingData, DayStatus } from '@/features/clients/types'

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type PillStyle = { bg: string; text: string; border: string }

const PILL_STYLES: Record<DayStatus, PillStyle> = {
  completed:   { bg: '#B5F23D',     text: '#0A0A0A', border: '#B5F23D' },
  in_progress: { bg: '#F2994A',     text: '#0A0A0A', border: '#F2994A' },
  today:       { bg: 'transparent', text: '#F0F0F0', border: '#F0F0F0' },
  upcoming:    { bg: 'transparent', text: '#4B5563', border: '#2A2D34' },
  past_missed: { bg: 'transparent', text: '#F25252', border: '#F25252' },
  rest:        { bg: 'transparent', text: '#2A2D34', border: 'transparent' },
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 10,
}

// ── Smart default day selection ────────────────────────────────────────────

function getDefaultDay(days: DayTrainingData[]): number {
  // 1. Today or in-progress training day
  const active = days.find((d) => d.status === 'today' || d.status === 'in_progress')
  if (active) return active.dayOfWeek
  // 2. Most recent completed day
  const lastCompleted = [...days].reverse().find((d) => d.status === 'completed')
  if (lastCompleted) return lastCompleted.dayOfWeek
  // 3. First upcoming training day
  const upcoming = days.find((d) => d.status === 'upcoming')
  if (upcoming) return upcoming.dayOfWeek
  // 4. First non-rest day
  const first = days.find((d) => d.status !== 'rest')
  return first?.dayOfWeek ?? 1
}

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  initialData: TrainingWeekData
  clientPlanId: string
  startDate: string
  clientId: string
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TrainingWeek({
  initialData,
  clientPlanId,
  startDate,
  clientId,
}: Props) {
  const [weekData, setWeekData] = useState(initialData)
  const [selectedDay, setSelectedDay] = useState(() => getDefaultDay(initialData.days))
  const [isPending, startTransition] = useTransition()

  const currentDay = weekData.days.find((d) => d.dayOfWeek === selectedDay) ?? weekData.days[0]

  function navigateWeek(delta: number) {
    const newWeek = weekData.weekNumber + delta
    if (newWeek < 1 || newWeek > weekData.totalWeeks) return
    startTransition(async () => {
      const data = await getWeekTrainingData(
        clientPlanId,
        newWeek,
        startDate,
        weekData.totalWeeks,
        clientId
      )
      setWeekData(data)
      setSelectedDay(getDefaultDay(data.days))
    })
  }

  const canGoPrev = weekData.weekNumber > 1
  const canGoNext = weekData.weekNumber < weekData.totalWeeks

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* ── Week header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1F2227',
        }}
      >
        <button
          type="button"
          onClick={() => navigateWeek(-1)}
          disabled={!canGoPrev || isPending}
          style={{
            background: 'none',
            border: 'none',
            cursor: canGoPrev && !isPending ? 'pointer' : 'default',
            padding: 4,
            color: canGoPrev && !isPending ? '#6B7280' : '#2A2D34',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isPending ? '#4B5563' : '#F0F0F0',
              transition: 'color 0.15s',
            }}
          >
            Semana {weekData.weekNumber}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
            de {weekData.totalWeeks} semanas
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateWeek(1)}
          disabled={!canGoNext || isPending}
          style={{
            background: 'none',
            border: 'none',
            cursor: canGoNext && !isPending ? 'pointer' : 'default',
            padding: 4,
            color: canGoNext && !isPending ? '#6B7280' : '#2A2D34',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Day strip ── */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 12px 4px',
          opacity: isPending ? 0.4 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {weekData.days.map((day) => {
          const isTraining = day.status !== 'rest'
          const isSelected = day.dayOfWeek === selectedDay
          const style = PILL_STYLES[day.status]

          return (
            <div
              key={day.dayOfWeek}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {isTraining ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(day.dayOfWeek)}
                  style={{
                    width: '100%',
                    height: 32,
                    borderRadius: 9999,
                    backgroundColor: style.bg,
                    border: `1.5px solid ${style.border}`,
                    color: style.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: isSelected ? `0 0 0 2px #B5F23D` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  {DAY_LABELS[day.dayOfWeek - 1]}
                </button>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#2A2D34', fontWeight: 500 }}>
                    {DAY_LABELS[day.dayOfWeek - 1]}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Day detail ── */}
      <div style={{ padding: '8px 16px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${weekData.weekNumber}-${selectedDay}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <DayDetail day={currentDay} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Day detail sub-component ───────────────────────────────────────────────

function DayDetail({ day }: { day: DayTrainingData }) {
  // Rest day
  if (day.status === 'rest') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          gap: 8,
          color: '#2A2D34',
        }}
      >
        <Moon size={22} />
        <p style={{ fontSize: 13, color: '#4B5563' }}>Día de descanso</p>
      </div>
    )
  }

  // Past missed
  if (day.status === 'past_missed') {
    return (
      <div
        style={{
          backgroundColor: 'rgba(242,82,82,0.06)',
          border: '1px solid rgba(242,82,82,0.2)',
          borderRadius: 10,
          padding: '12px 14px',
          marginTop: 8,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: '#F25252' }}>No registrado</p>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          El cliente no registró esta sesión.
        </p>
      </div>
    )
  }

  if (day.exercises.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#4B5563', padding: '16px 0' }}>
        Sin ejercicios planificados para este día.
      </p>
    )
  }

  // Upcoming or today (planned only)
  if (day.status === 'upcoming' || day.status === 'today') {
    return (
      <div style={{ marginTop: 8 }}>
        <p style={SECTION_LABEL}>
          {day.status === 'today' ? 'Entrenamiento de hoy' : 'Planificado'}
        </p>
        {day.exercises.map((ex, i) => (
          <div
            key={ex.clientPlanDayExerciseId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderTop: i > 0 ? '1px solid #1A1D22' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: '#F0F0F0' }}>{ex.name}</span>
            <span
              style={{
                fontSize: 12,
                color: '#6B7280',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              {ex.plannedSets} ×{' '}
              {ex.plannedReps != null
                ? `${ex.plannedReps} reps`
                : ex.plannedDurationSeconds != null
                ? `${ex.plannedDurationSeconds}s`
                : '—'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Completed or in_progress — full set detail
  const completedSets = day.exercises.reduce(
    (acc, ex) => acc + ex.sessionSets.filter((s) => s.completed).length,
    0
  )
  const totalPlannedSets = day.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0)

  return (
    <div style={{ marginTop: 8 }}>
      {/* Session summary badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: day.status === 'completed' ? '#B5F23D' : '#F2994A',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {day.status === 'completed' ? 'Completado' : 'En progreso'}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          {completedSets}/{totalPlannedSets} series
        </span>
      </div>

      {/* Exercise list with sets */}
      {day.exercises.map((ex, exIndex) => (
        <motion.div
          key={ex.clientPlanDayExerciseId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: exIndex * 0.05 }}
          style={{
            paddingTop: exIndex > 0 ? 14 : 0,
            marginTop: exIndex > 0 ? 14 : 0,
            borderTop: exIndex > 0 ? '1px solid #1A1D22' : 'none',
          }}
        >
          {/* Exercise name */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#F0F0F0',
              marginBottom: 8,
            }}
          >
            {ex.name}
          </p>

          {/* Set rows */}
          {ex.sessionSets.length > 0 ? (
            ex.sessionSets.map((set) => {
              const weightPart = set.weightKg != null ? `${set.weightKg} kg` : ''
              const repPart =
                set.durationSeconds != null
                  ? `${set.durationSeconds}s`
                  : ex.plannedReps != null
                  ? `${ex.plannedReps} reps`
                  : ''
              const separator = weightPart && repPart ? ' × ' : ''

              return (
                <div
                  key={set.setNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                      minWidth: 60,
                      flexShrink: 0,
                    }}
                  >
                    Serie {set.setNumber}
                  </span>
                  <span
                    style={{ fontSize: 12, color: '#9CA3AF', flex: 1 }}
                  >
                    {weightPart}{separator}{repPart}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: set.completed ? '#B5F23D' : '#F25252',
                    }}
                  >
                    {set.completed ? '✓' : '✗'}
                  </span>
                </div>
              )
            })
          ) : (
            <p style={{ fontSize: 12, color: '#4B5563', fontStyle: 'italic' }}>
              Sin datos registrados
            </p>
          )}
        </motion.div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/training-week.tsx"
git commit -m "feat: add TrainingWeek component — week navigator, day strip, set-level detail"
```

---

### Task 7: Page assembly

**Files:**
- Create: `src/app/(coach)/coach/clients/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(coach)/coach/clients/[id]/page.tsx`:

```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientProfileData } from './queries'
import ClientProfileHeader from './client-profile-header'
import KpiStrip from './kpi-strip'
import TrainingWeek from './training-week'
import PlanCard from './plan-card'
import PhysicalProfile from './physical-profile'
import CoachNotes from './coach-notes'

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profile = await getClientProfileData(id, user.id)
  if (!profile) notFound()

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ClientProfileHeader
        fullName={profile.fullName}
        goal={profile.goal}
        statusColor={profile.statusColor}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          padding: '20px 20px 120px',
        }}
      >
        <KpiStrip
          weeklyCompliance={profile.weeklyCompliance}
          daysSinceLastSession={profile.daysSinceLastSession}
          totalSessions={profile.totalSessions}
        />

        {/* Entrenamiento — focal section */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Entrenamiento
          </p>
          {profile.currentWeekData && profile.activePlan ? (
            <TrainingWeek
              initialData={profile.currentWeekData}
              clientPlanId={profile.activePlan.id}
              startDate={profile.activePlan.startDate}
              clientId={profile.id}
            />
          ) : (
            <div
              style={{
                backgroundColor: '#111317',
                border: '1px solid #1F2227',
                borderRadius: 14,
                padding: '24px 16px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 14, color: '#4B5563' }}>
                Sin plan activo — no hay entrenamientos que mostrar.
              </p>
            </div>
          )}
        </div>

        <PlanCard activePlan={profile.activePlan} />

        <PhysicalProfile
          age={profile.age}
          sex={profile.sex}
          weightKg={profile.weightKg}
          heightCm={profile.heightCm}
          experienceLevel={profile.experienceLevel}
          daysPerWeek={profile.daysPerWeek}
          injuries={profile.injuries}
        />

        <CoachNotes clientId={profile.id} initialNote={profile.coachNote} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass (the new page doesn't add unit tests — functionality is tested manually).

- [ ] **Step 4: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/coach/clients`
3. Click on any client — should navigate to `/coach/clients/[id]`
4. Verify:
   - Header shows client name, goal, colored status badge
   - KPI strip shows 3 cards (compliance %, last session, total sessions)
   - "Entrenamiento" section: if client has no active plan, shows "Sin plan activo"
   - If client has an active plan, shows the week navigator with day pills
   - Clicking different day pills animates the detail card
   - `‹` and `›` buttons navigate between weeks (disabled at week 1 / last week)
   - Plan card shows plan name, progress bar, dates
   - Physical profile grid shows all 6 data chips
   - Injuries row appears if injuries are set
   - Coach notes shows "Sin notas" empty state; clicking Editar opens textarea; Guardar saves
5. Navigate to a non-existent client id: should get a 404

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/page.tsx"
git commit -m "feat: add /coach/clients/[id] page — client profile with training week navigator"
```
