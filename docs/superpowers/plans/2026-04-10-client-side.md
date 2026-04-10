# Client Side — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-facing screens so a logged-in client can view their active plan, start and log training sessions set-by-set, and review their session history.

**Architecture:** Three route groups: `(client)` (header + bottom nav) holds the home dashboard and history screens; `(training)` (minimal full-screen layout, no nav) holds the live training screen. The home screen is a Server Component that fetches the client's active plan and today's training day; a `TodayCard` client component handles navigation to the training screen. The live training screen is a Server Component that loads session + exercises + existing sets, and passes them to `LiveTraining` ('use client') which handles per-set logging via server actions already in `src/features/training/actions/`.

**Tech Stack:** Next.js 16 App Router (`await params`), React 19 `useTransition` + `useRouter`, inline styles (no Tailwind in new files), Supabase server client, framer-motion not needed here, lucide-react.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/training/types.ts` | Create | Domain types: `ClientDashboardData`, `TodayDayData`, `TodayExercise`, `ClientActivePlan`, `LiveSessionData`, `LiveExercise`, `SetLog`, `SessionHistoryItem` |
| `src/app/(client)/layout.tsx` | Modify | Overhaul to inline styles + mobile container + `ClientBottomNav` |
| `src/components/ui/client-bottom-nav.tsx` | Create | Bottom nav for client routes (Inicio + Historial) |
| `src/app/(client)/client/dashboard/queries.ts` | Create | `getClientDashboardData` — active plan + today's training day |
| `src/app/(client)/client/dashboard/page.tsx` | Modify | Server Component: fetch + render plan card + TodayCard |
| `src/app/(client)/client/dashboard/today-card.tsx` | Create | `'use client'` — exercise list + start/resume button |
| `src/app/(training)/layout.tsx` | Create | Minimal full-screen layout for training (no header/nav) |
| `src/app/(training)/client/training/[sessionId]/queries.ts` | Create | `getLiveSessionData` — session + exercises + logged sets |
| `src/app/(training)/client/training/[sessionId]/page.tsx` | Create | Server Component: auth + fetch + render `LiveTraining` |
| `src/app/(training)/client/training/[sessionId]/live-training.tsx` | Create | `'use client'` — set-by-set logging, optimistic updates, finish |
| `src/app/(client)/client/history/queries.ts` | Create | `getSessionHistory` — past sessions list |
| `src/app/(client)/client/history/page.tsx` | Create | Server Component: history list |

---

### Task 1: Types + client layout overhaul + bottom nav

**Files:**
- Create: `src/features/training/types.ts`
- Modify: `src/app/(client)/layout.tsx`
- Create: `src/components/ui/client-bottom-nav.tsx`

- [x] **Step 1: Create `src/features/training/types.ts`**

```typescript
// Types for the client-side training features

export type TodayExercise = {
  clientPlanDayExerciseId: string
  name: string
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
}

export type TodayDayData = {
  clientPlanDayId: string
  dayOfWeek: number
  exercises: TodayExercise[]
  existingSessionId: string | null
  sessionStatus: 'in_progress' | 'completed' | null
}

export type ClientActivePlan = {
  id: string
  name: string
  weeks: number
  currentWeek: number
  startDate: string
  endDate: string
  progressPct: number
}

export type ClientDashboardData = {
  fullName: string
  activePlan: ClientActivePlan | null
  today: TodayDayData | null  // null = rest day or no active plan
}

// ── Live training types ────────────────────────────────────────────────────

export type SetLog = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type LiveExercise = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  loggedSets: SetLog[]
}

export type LiveSessionData = {
  sessionId: string
  clientPlanDayId: string
  status: 'in_progress' | 'completed'
  exercises: LiveExercise[]
}

// ── History types ──────────────────────────────────────────────────────────

export type SessionHistoryItem = {
  id: string
  date: string
  status: 'in_progress' | 'completed'
  completedAt: string | null
  planName: string
  dayOfWeek: number
}
```

- [x] **Step 2: Create `src/components/ui/client-bottom-nav.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Inicio', href: '/client/dashboard', Icon: Home },
  { label: 'Historial', href: '/client/history', Icon: Clock },
]

export default function ClientBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: '#0A0A0A',
        borderTop: '1px solid #1F2227',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map(({ label, href, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              textDecoration: 'none',
              color: isActive ? '#B5F23D' : '#6B7280',
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [x] **Step 3: Overhaul `src/app/(client)/layout.tsx`**

Read the file first (`src/app/(client)/layout.tsx`). Replace its full content with:

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import ClientBottomNav from '@/components/ui/client-bottom-nav'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/coach/dashboard')

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
        color: '#F0F0F0',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#0A0A0A',
          padding: '16px 20px',
          flexShrink: 0,
          borderBottom: '1px solid #1F2227',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
      </header>

      {/* Scrollable content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      <ClientBottomNav />
    </div>
  )
}
```

- [x] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [x] **Step 5: Run tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1
```

Expected: all tests pass (no new tests in this task — types and layout have no unit-testable logic).

- [x] **Step 6: Commit**

```bash
cd "C:\Users\herna\Loboost App" && git add src/features/training/types.ts src/components/ui/client-bottom-nav.tsx "src/app/(client)/layout.tsx" && git commit -m "feat: client training types, layout overhaul, client bottom nav"
```

---

### Task 2: Client dashboard — home screen

**Files:**
- Create: `src/app/(client)/client/dashboard/queries.ts`
- Modify: `src/app/(client)/client/dashboard/page.tsx`
- Create: `src/app/(client)/client/dashboard/today-card.tsx`

- [x] **Step 1: Create `src/app/(client)/client/dashboard/queries.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentWeek,
  computeDayDate,
} from '@/features/clients/utils/training-utils'
import type {
  ClientDashboardData,
  ClientActivePlan,
  TodayDayData,
  TodayExercise,
} from '@/features/training/types'

export async function getClientDashboardData(
  clientId: string
): Promise<ClientDashboardData> {
  const supabase = await createClient()

  const [profileResult, planResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const fullName = profileResult.data?.full_name ?? 'Cliente'
  const plan = planResult.data

  if (!plan) {
    return { fullName, activePlan: null, today: null }
  }

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = new Date().toISOString().split('T')[0]
  const progressPct = Math.max(8, Math.round(((currentWeek - 1) / plan.weeks) * 100))

  const activePlan: ClientActivePlan = {
    id: plan.id,
    name: plan.name,
    weeks: plan.weeks,
    currentWeek,
    startDate: plan.start_date,
    endDate: plan.end_date,
    progressPct,
  }

  // Get plan days for current week to find today
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week')
    .eq('client_plan_id', plan.id)
    .eq('week_number', currentWeek)

  if (!planDays || planDays.length === 0) {
    return { fullName, activePlan, today: null }
  }

  const todayPlanDay = planDays.find(
    (d) => computeDayDate(plan.start_date, currentWeek, d.day_of_week) === todayISO
  )

  if (!todayPlanDay) {
    return { fullName, activePlan, today: null }
  }

  // Load exercises + existing session for today in parallel
  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select('id, order, sets, reps, duration_seconds, exercises(name)')
      .eq('client_plan_day_id', todayPlanDay.id)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('client_plan_day_id', todayPlanDay.id)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  const exercises: TodayExercise[] = (exercisesResult.data ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    name: (ex.exercises as { name: string } | null)?.name ?? 'Ejercicio',
    order: ex.order,
    plannedSets: ex.sets,
    plannedReps: ex.reps ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
  }))

  const today: TodayDayData = {
    clientPlanDayId: todayPlanDay.id,
    dayOfWeek: todayPlanDay.day_of_week,
    exercises,
    existingSessionId: sessionResult.data?.id ?? null,
    sessionStatus:
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }

  return { fullName, activePlan, today }
}
```

- [x] **Step 2: Create `src/app/(client)/client/dashboard/today-card.tsx`**

```typescript
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import type { TodayDayData } from '@/features/training/types'

export default function TodayCard({ today }: { today: TodayDayData | null }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!today) {
    return (
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 22, marginBottom: 8 }}>💤</p>
        <p style={{ fontSize: 14, color: '#4B5563' }}>Día de descanso</p>
        <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
          Descansá, mañana volvemos.
        </p>
      </div>
    )
  }

  const isCompleted = today.sessionStatus === 'completed'
  const isInProgress = today.sessionStatus === 'in_progress'

  function handleStart() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientPlanDayId', today!.clientPlanDayId)
      const result = await startSessionAction(formData)
      if (result.success && result.sessionId) {
        router.push(`/client/training/${result.sessionId}`)
      }
    })
  }

  function handleResume() {
    if (today.existingSessionId) {
      router.push(`/client/training/${today.existingSessionId}`)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Status banner */}
      {isCompleted && (
        <div
          style={{
            backgroundColor: 'rgba(181,242,61,0.1)',
            padding: '8px 16px',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#B5F23D' }}>
            ✓ Entrenamiento completado
          </p>
        </div>
      )}
      {isInProgress && (
        <div
          style={{
            backgroundColor: 'rgba(242,153,74,0.1)',
            padding: '8px 16px',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#F2994A' }}>
            En progreso — podés retomar
          </p>
        </div>
      )}

      {/* Exercise list */}
      <div style={{ padding: '14px 16px' }}>
        {today.exercises.length === 0 ? (
          <p style={{ fontSize: 13, color: '#4B5563' }}>
            Sin ejercicios planificados para hoy.
          </p>
        ) : (
          today.exercises.map((ex, i) => (
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
          ))
        )}
      </div>

      {/* CTA */}
      {!isCompleted && today.exercises.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={isInProgress ? handleResume : handleStart}
            disabled={isPending}
            style={{
              width: '100%',
              padding: 14,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 12,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending
              ? 'Cargando...'
              : isInProgress
              ? 'Retomar entrenamiento'
              : 'Iniciar entrenamiento'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 3: Replace `src/app/(client)/client/dashboard/page.tsx`**

Read the file first. Replace its full content with:

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientDashboardData } from './queries'
import TodayCard from './today-card'

const DAY_NAMES = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function todayDayName(): string {
  const d = new Date().getDay() // 0=Sun
  return DAY_NAMES[d === 0 ? 7 : d]
}

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientDashboardData(user.id)

  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Greeting */}
      <div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>
          Bienvenido
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>
          {data.fullName}
        </p>
      </div>

      {/* Active plan */}
      <div>
        <p style={SECTION_TITLE}>Plan activo</p>
        {data.activePlan ? (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#F0F0F0',
                marginBottom: 6,
              }}
            >
              {data.activePlan.name}
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
              Semana {data.activePlan.currentWeek} de {data.activePlan.weeks}
              {' · '}
              {formatDate(data.activePlan.startDate)} →{' '}
              {formatDate(data.activePlan.endDate)}
            </p>
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
                  width: `${data.activePlan.progressPct}%`,
                  backgroundColor: '#B5F23D',
                  borderRadius: 9999,
                }}
              />
            </div>
            <p
              style={{
                fontSize: 11,
                color: '#6B7280',
                marginTop: 6,
                textAlign: 'right',
              }}
            >
              {data.activePlan.progressPct}%
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: '#4B5563' }}>
              No tenés un plan activo todavía.
            </p>
            <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
              Tu coach te asignará uno pronto.
            </p>
          </div>
        )}
      </div>

      {/* Today's training */}
      <div>
        <p style={SECTION_TITLE}>Hoy · {todayDayName()}</p>
        <TodayCard today={data.today} />
      </div>
    </div>
  )
}
```

- [x] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [x] **Step 5: Run tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1
```

Expected: all tests pass.

- [x] **Step 6: Commit**

```bash
cd "C:\Users\herna\Loboost App" && git add "src/app/(client)/client/dashboard/queries.ts" "src/app/(client)/client/dashboard/today-card.tsx" "src/app/(client)/client/dashboard/page.tsx" && git commit -m "feat: client dashboard — active plan card and today's training day"
```

---

### Task 3: Live training screen

**Files:**
- Create: `src/app/(training)/layout.tsx`
- Create: `src/app/(training)/client/training/[sessionId]/queries.ts`
- Create: `src/app/(training)/client/training/[sessionId]/page.tsx`
- Create: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

Note: `(training)` is a Next.js route group. The folder name in parentheses does NOT appear in the URL. The URL for the page is `/client/training/[sessionId]`.

- [x] **Step 1: Create `src/app/(training)/layout.tsx`**

```typescript
export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        height: '100dvh',
        backgroundColor: '#0A0A0A',
        color: '#F0F0F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}
```

- [x] **Step 2: Create `src/app/(training)/client/training/[sessionId]/queries.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { LiveSessionData, LiveExercise, SetLog } from '@/features/training/types'

export async function getLiveSessionData(
  sessionId: string,
  clientId: string
): Promise<LiveSessionData | null> {
  const supabase = await createClient()

  // Verify session belongs to this client
  const { data: session } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (!session) return null

  // Fetch exercises + logged sets in parallel
  const [exercisesResult, setsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type)'
      )
      .eq('client_plan_day_id', session.client_plan_day_id)
      .order('order'),
    supabase
      .from('session_sets')
      .select(
        'client_plan_day_exercise_id, set_number, weight_kg, duration_seconds, completed'
      )
      .eq('session_id', sessionId)
      .order('set_number'),
  ])

  // Index sets by exercise id
  const setsByExId = new Map<string, SetLog[]>()
  for (const s of setsResult.data ?? []) {
    const id = s.client_plan_day_exercise_id
    if (!setsByExId.has(id)) setsByExId.set(id, [])
    setsByExId.get(id)!.push({
      setNumber: s.set_number,
      weightKg: s.weight_kg,
      durationSeconds: s.duration_seconds,
      completed: s.completed,
    })
  }

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: { id: string; name: string; muscle_group: string; type: string } | null
  }

  const exercises: LiveExercise[] = (exercisesResult.data as ExRow[] ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercises?.name ?? 'Ejercicio',
    muscleGroup: ex.exercises?.muscle_group ?? '',
    type: (ex.exercises?.type as 'strength' | 'cardio') ?? 'strength',
    order: ex.order,
    plannedSets: ex.sets,
    plannedReps: ex.reps ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
    restSeconds: ex.rest_seconds ?? null,
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

- [x] **Step 3: Create `src/app/(training)/client/training/[sessionId]/page.tsx`**

```typescript
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getLiveSessionData } from './queries'
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

  return <LiveTraining session={session} />
}
```

- [x] **Step 4: Create `src/app/(training)/client/training/[sessionId]/live-training.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import type { LiveSessionData } from '@/features/training/types'

type SetInputs = { weight: string; duration: string }

function makeKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

export default function LiveTraining({ session }: { session: LiveSessionData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Initialize completed set keys from server data
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
      }
    }
    return s
  })

  // Per-set inputs: key = `exerciseId:setNumber`
  const [inputs, setInputs] = useState<Map<string, SetInputs>>(() => {
    const m = new Map<string, SetInputs>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        m.set(makeKey(ex.clientPlanDayExerciseId, set.setNumber), {
          weight: set.weightKg != null ? String(set.weightKg) : '',
          duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
        })
      }
    }
    return m
  })

  function getInput(exId: string, setNum: number): SetInputs {
    return inputs.get(makeKey(exId, setNum)) ?? { weight: '', duration: '' }
  }

  function updateInput(exId: string, setNum: number, patch: Partial<SetInputs>) {
    setInputs((prev) => {
      const next = new Map(prev)
      next.set(makeKey(exId, setNum), { ...getInput(exId, setNum), ...patch })
      return next
    })
  }

  function handleCompleteSet(
    exerciseId: string,
    setNumber: number,
    type: 'strength' | 'cardio'
  ) {
    const key = makeKey(exerciseId, setNumber)
    const inp = getInput(exerciseId, setNumber)

    // Optimistic update
    setLocalCompleted((prev) => new Set([...prev, key]))

    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', exerciseId)
      formData.set('setNumber', String(setNumber))
      if (type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
      if (type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)

      const result = await completeSetAction(formData)
      if (result.error) {
        // Revert on error
        setLocalCompleted((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    })
  }

  function handleFinish() {
    startTransition(async () => {
      await completeSessionAction(session.sessionId)
      router.push('/client/dashboard')
    })
  }

  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0)
  const allDone = localCompleted.size >= totalSets

  const completedExCount = session.exercises.filter((ex) =>
    Array.from({ length: ex.plannedSets }, (_, i) => i + 1).every((n) =>
      localCompleted.has(makeKey(ex.clientPlanDayExerciseId, n))
    )
  ).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
            Entrenamiento
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
            {completedExCount} / {session.exercises.length} ejercicios
          </p>
        </div>
      </div>

      {/* Scrollable exercises */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {session.exercises.map((ex) => {
          const setNumbers = Array.from({ length: ex.plannedSets }, (_, i) => i + 1)
          const exAllDone = setNumbers.every((n) =>
            localCompleted.has(makeKey(ex.clientPlanDayExerciseId, n))
          )

          return (
            <div
              key={ex.clientPlanDayExerciseId}
              style={{
                backgroundColor: '#111317',
                border: `1px solid ${exAllDone ? 'rgba(181,242,61,0.3)' : '#1F2227'}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Exercise header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1F2227',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: exAllDone ? '#B5F23D' : '#F0F0F0',
                    }}
                  >
                    {ex.name}
                  </p>
                  {ex.muscleGroup && (
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {ex.muscleGroup}
                    </p>
                  )}
                </div>
                {exAllDone && <CheckCircle size={18} color="#B5F23D" />}
              </div>

              {/* Sets */}
              <div
                style={{
                  padding: '10px 16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {setNumbers.map((setNum) => {
                  const key = makeKey(ex.clientPlanDayExerciseId, setNum)
                  const isDone = localCompleted.has(key)
                  const inp = getInput(ex.clientPlanDayExerciseId, setNum)

                  return (
                    <div
                      key={setNum}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          minWidth: 54,
                          flexShrink: 0,
                        }}
                      >
                        Serie {setNum}
                      </span>

                      {isDone ? (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                            {ex.type === 'strength'
                              ? `${inp.weight || '—'} kg × ${ex.plannedReps ?? '—'} reps`
                              : `${inp.duration || '—'} seg`}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: '#B5F23D',
                              marginLeft: 'auto',
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {ex.type === 'strength' ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="kg"
                              value={inp.weight}
                              onChange={(e) =>
                                updateInput(ex.clientPlanDayExerciseId, setNum, {
                                  weight: e.target.value,
                                })
                              }
                              style={{
                                width: 62,
                                padding: '7px 8px',
                                backgroundColor: '#1A1D22',
                                border: '1px solid #2A2D34',
                                borderRadius: 8,
                                color: '#F0F0F0',
                                fontSize: 14,
                                textAlign: 'center',
                              }}
                            />
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="seg"
                              value={inp.duration}
                              onChange={(e) =>
                                updateInput(ex.clientPlanDayExerciseId, setNum, {
                                  duration: e.target.value,
                                })
                              }
                              style={{
                                width: 62,
                                padding: '7px 8px',
                                backgroundColor: '#1A1D22',
                                border: '1px solid #2A2D34',
                                borderRadius: 8,
                                color: '#F0F0F0',
                                fontSize: 14,
                                textAlign: 'center',
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleCompleteSet(
                                ex.clientPlanDayExerciseId,
                                setNum,
                                ex.type
                              )
                            }
                            disabled={isPending}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              backgroundColor: '#1F2227',
                              border: '1px solid #2A2D34',
                              borderRadius: 8,
                              color: '#9CA3AF',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: isPending ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Completar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Finish button — appears when all sets are done */}
        {allDone && (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            style={{
              width: '100%',
              padding: 16,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 14,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {isPending ? 'Guardando...' : '✓ Finalizar entrenamiento'}
          </button>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
```

- [x] **Step 5: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [x] **Step 6: Run tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1
```

Expected: all tests pass.

- [x] **Step 7: Commit**

```bash
cd "C:\Users\herna\Loboost App" && git add "src/app/(training)" && git commit -m "feat: live training screen — set-by-set logging with optimistic updates"
```

---

### Task 4: Session history

**Files:**
- Create: `src/app/(client)/client/history/queries.ts`
- Create: `src/app/(client)/client/history/page.tsx`

- [x] **Step 1: Create `src/app/(client)/client/history/queries.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { SessionHistoryItem } from '@/features/training/types'

export async function getSessionHistory(
  clientId: string
): Promise<SessionHistoryItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sessions')
    .select(
      `id, date, status, completed_at,
       client_plan_days(
         day_of_week,
         client_plans(name)
       )`
    )
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(50)

  type Row = {
    id: string
    date: string
    status: string
    completed_at: string | null
    client_plan_days: {
      day_of_week: number
      client_plans: { name: string } | null
    } | null
  }

  return ((data as Row[]) ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status as 'in_progress' | 'completed',
    completedAt: s.completed_at,
    planName: s.client_plan_days?.client_plans?.name ?? 'Entrenamiento',
    dayOfWeek: s.client_plan_days?.day_of_week ?? 0,
  }))
}
```

- [x] **Step 2: Create `src/app/(client)/client/history/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getSessionHistory } from './queries'

const DAY_NAMES = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sessions = await getSessionHistory(user.id)

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>
        Historial
      </p>

      {sessions.length === 0 ? (
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563' }}>
            Todavía no hay sesiones registradas.
          </p>
          <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
            Completá tu primer entrenamiento para verlo acá.
          </p>
        </div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#F0F0F0',
                  marginBottom: 3,
                }}
              >
                {s.planName}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>
                {s.dayOfWeek > 0 ? `${DAY_NAMES[s.dayOfWeek]} · ` : ''}
                {formatDate(s.date)}
              </p>
            </div>
            <span
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 9999,
                backgroundColor:
                  s.status === 'completed'
                    ? 'rgba(181,242,61,0.12)'
                    : 'rgba(242,153,74,0.12)',
                color: s.status === 'completed' ? '#B5F23D' : '#F2994A',
              }}
            >
              {s.status === 'completed' ? 'Completado' : 'En progreso'}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
```

- [x] **Step 3: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [x] **Step 4: Run tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1
```

Expected: all tests pass.

- [x] **Step 5: Manual smoke test**

```bash
cd "C:\Users\herna\Loboost App" && npm run dev
```

1. Login as a **client** user (one created by the coach) at `http://localhost:3000/login`
2. Should redirect to `/client/dashboard`
3. Verify: LoBoost header, client bottom nav (Inicio + Historial), plan card with progress bar, today's training card
4. Tap **Iniciar entrenamiento** → navigates to `/client/training/[sessionId]` (full-screen, no nav)
5. Enter a weight, tap **Completar** → set turns green with ✓
6. Complete all sets → **Finalizar entrenamiento** button appears
7. Tap Finalizar → redirects to dashboard, session shows "Completado"
8. Navigate to **Historial** → session appears in the list with "Completado" badge
9. If today is a rest day or no plan active: correct empty states show

- [x] **Step 6: Commit**

```bash
cd "C:\Users\herna\Loboost App" && git add "src/app/(client)/client/history/" && git commit -m "feat: session history screen"
```
