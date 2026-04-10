# Client Side Complete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all client-side screens so the client app is fully functional: dashboard, plan view, live training (step-by-step), weekly history, nutrition placeholder, and settings with notification preferences.

**Architecture:** All new screens follow the existing (client) route group pattern — Server Components for data fetching, `'use client'` components only where interactivity is needed. Inline styles throughout matching the existing dark design system. New shared components (ClientAvatar, VideoModal) go in `src/components/ui/`. New domain types go in `src/features/training/types.ts`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (server client), Zod (existing schemas), lucide-react icons, inline styles.

---

## File Map

**Create:**
- `src/components/ui/client-avatar.tsx` — initials avatar, reused in dashboard + settings
- `src/components/ui/video-modal.tsx` — overlay modal for exercise video link
- `src/app/(client)/client/plan/page.tsx` — plan overview with week navigation
- `src/app/(client)/client/plan/queries.ts` — all weeks + day statuses
- `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/page.tsx` — day detail
- `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts` — exercises + session status
- `src/app/(client)/client/history/week/[weekNumber]/page.tsx` — week detail (sessions + sets)
- `src/app/(client)/client/history/week/[weekNumber]/queries.ts`
- `src/app/(client)/client/nutrition/page.tsx` — empty state
- `src/app/(client)/client/settings/page.tsx` — profile + notification toggles + logout
- `src/app/(client)/client/settings/notification-toggles.tsx` — client component for toggles
- `src/features/training/actions/save-notification-prefs.ts` — upsert prefs to DB
- `supabase/migrations/20260410120000_notification_preferences.sql`

**Modify:**
- `src/features/training/types.ts` — add PlanWeekData, PlanDayWithStatus, ClientPlanViewData, DayExerciseDetail, DayDetailData, WeekHistorySummary, WeekDetailSession, WeekDetailExercise, WeekDetailSet, NotificationPrefs; add `videoUrl` to LiveExercise
- `src/components/ui/client-bottom-nav.tsx` — 4 items: Inicio | Plan | Historial | Ajustes
- `src/app/(client)/client/dashboard/page.tsx` — avatar + date + "Ver plan" button + nutrition button
- `src/app/(client)/client/dashboard/today-card.tsx` — exercise count context, more prominent in-progress state
- `src/app/(client)/client/history/queries.ts` — weekly summaries query
- `src/app/(client)/client/history/page.tsx` — weekly list with compliance %
- `src/app/(training)/client/training/[sessionId]/queries.ts` — add video_url to exercises select
- `src/app/(training)/client/training/[sessionId]/live-training.tsx` — full step-by-step redesign

---

## Task 1: DB Migration — notification_preferences

**Files:**
- Create: `supabase/migrations/20260410120000_notification_preferences.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260410120000_notification_preferences.sql
create table if not exists notification_preferences (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references profiles(id) on delete cascade,
  reminders    boolean not null default true,
  coach_msgs   boolean not null default true,
  updated_at   timestamptz not null default now(),
  constraint notification_preferences_client_id_key unique (client_id)
);

alter table notification_preferences enable row level security;

create policy "Clients manage own notification preferences"
  on notification_preferences
  for all
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with the SQL above on project `zsczvjsqkgmvouzcjcvv`.

- [ ] **Step 3: Verify table exists**

Use `mcp__plugin_supabase_supabase__execute_sql`:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'notification_preferences';
```
Expected: 5 columns — id, client_id, reminders, coach_msgs, updated_at.

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/migrations/20260410120000_notification_preferences.sql
git commit -m "feat: add notification_preferences table migration"
```

---

## Task 2: Extend types.ts

**Files:**
- Modify: `src/features/training/types.ts`

- [ ] **Step 1: Add all new types to the end of the file**

Open `src/features/training/types.ts` and append:

```typescript
// ── Plan view types ────────────────────────────────────────────────────────

export type PlanDayWithStatus = {
  clientPlanDayId: string
  weekNumber: number
  dayOfWeek: number
  dateISO: string
  status: 'completed' | 'in_progress' | 'today' | 'upcoming' | 'past_missed'
  existingSessionId: string | null
}

export type PlanWeekData = {
  weekNumber: number
  days: PlanDayWithStatus[]
}

export type ClientPlanViewData = {
  planId: string
  planName: string
  startDate: string
  endDate: string
  weeks: number
  currentWeek: number
  progressPct: number
  weeksByNumber: PlanWeekData[]
}

// ── Day detail types ───────────────────────────────────────────────────────

export type DayExerciseDetail = {
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
  videoUrl: string | null
}

export type DayDetailData = {
  clientPlanDayId: string
  weekNumber: number
  dayOfWeek: number
  dateISO: string
  exercises: DayExerciseDetail[]
  sessionId: string | null
  sessionStatus: 'in_progress' | 'completed' | null
}

// ── Weekly history types ───────────────────────────────────────────────────

export type WeekHistorySummary = {
  weekNumber: number
  dateRangeStart: string
  dateRangeEnd: string
  completedDays: number
  totalTrainingDays: number
  compliancePct: number
}

export type WeekDetailSet = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type WeekDetailExercise = {
  clientPlanDayExerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  plannedReps: number | null
  plannedDurationSeconds: number | null
  sets: WeekDetailSet[]
}

export type WeekDetailSession = {
  sessionId: string
  clientPlanDayId: string
  dayOfWeek: number
  dateISO: string
  completedAt: string | null
  exercises: WeekDetailExercise[]
}

export type WeekDetailData = {
  weekNumber: number
  dateRangeStart: string
  dateRangeEnd: string
  sessions: WeekDetailSession[]
}

// ── Notification prefs ─────────────────────────────────────────────────────

export type NotificationPrefs = {
  reminders: boolean
  coachMsgs: boolean
}
```

Also update `LiveExercise` — add `videoUrl: string | null` after `restSeconds`:

```typescript
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
  videoUrl: string | null   // ← add this
  loggedSets: SetLog[]
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors (new fields don't break existing code yet — queries.ts will be updated in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/features/training/types.ts
git commit -m "feat: extend training types for plan view, day detail, weekly history, notification prefs"
```

---

## Task 3: Shared Components — ClientAvatar + VideoModal

**Files:**
- Create: `src/components/ui/client-avatar.tsx`
- Create: `src/components/ui/video-modal.tsx`

- [ ] **Step 1: Create ClientAvatar**

```typescript
// src/components/ui/client-avatar.tsx
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626']

export default function ClientAvatar({
  name,
  size = 40,
}: {
  name: string
  size?: number
}) {
  const initials = getInitials(name)
  const colorIndex = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  const bg = AVATAR_COLORS[colorIndex]

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
```

- [ ] **Step 2: Create VideoModal**

```typescript
// src/components/ui/video-modal.tsx
'use client'

export default function VideoModal({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#111317',
          borderRadius: 16,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1F2227',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
            Video del ejercicio
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              fontSize: 22,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '13px 16px',
              backgroundColor: '#1F2227',
              borderRadius: 10,
              color: '#B5F23D',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Abrir video →
          </a>
          <p
            style={{
              fontSize: 11,
              color: '#4B5563',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Se abre en una nueva pestaña
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/client-avatar.tsx src/components/ui/video-modal.tsx
git commit -m "feat: add ClientAvatar and VideoModal shared components"
```

---

## Task 4: Update Bottom Nav — 4 Items

**Files:**
- Modify: `src/components/ui/client-bottom-nav.tsx`

- [ ] **Step 1: Replace the file content**

```typescript
// src/components/ui/client-bottom-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Clock, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Inicio',    href: '/client/dashboard', Icon: Home },
  { label: 'Plan',      href: '/client/plan',       Icon: CalendarDays },
  { label: 'Historial', href: '/client/history',    Icon: Clock },
  { label: 'Ajustes',   href: '/client/settings',   Icon: Settings },
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
        const isActive =
          pathname === href || pathname.startsWith(href + '/')
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

- [ ] **Step 2: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/client-bottom-nav.tsx
git commit -m "feat: update client bottom nav to 4 items (Inicio, Plan, Historial, Ajustes)"
```

---

## Task 5: Improve Dashboard

**Files:**
- Modify: `src/app/(client)/client/dashboard/page.tsx`
- Modify: `src/app/(client)/client/dashboard/today-card.tsx`

- [ ] **Step 1: Replace dashboard page.tsx**

```typescript
// src/app/(client)/client/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientDashboardData } from './queries'
import TodayCard from './today-card'
import ClientAvatar from '@/components/ui/client-avatar'

const DAY_NAMES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatFullDate(): string {
  const now = new Date()
  const dayOfWeek = DAY_NAMES[now.getDay() === 0 ? 7 : now.getDay()]
  const day = now.getDate()
  const month = MONTH_NAMES[now.getMonth()]
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${day} de ${month}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
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
      {/* Header: avatar + greeting + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClientAvatar name={data.fullName} size={46} />
        <div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>{formatFullDate()}</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginTop: 1 }}>
            Hola, {data.fullName.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Active plan */}
      {data.activePlan ? (
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
                {data.activePlan.name}
              </p>
              <Link
                href="/client/plan"
                style={{
                  fontSize: 12,
                  color: '#B5F23D',
                  fontWeight: 600,
                  textDecoration: 'none',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                Ver plan →
              </Link>
            </div>
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
            Tu coach todavía no te asignó un plan.
          </p>
        </div>
      )}

      {/* Today's training */}
      <div>
        <p style={SECTION_TITLE}>Hoy</p>
        <TodayCard today={data.today} />
      </div>

      {/* Nutrition shortcut */}
      <Link
        href="/client/nutrition"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🥗</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>Nutrición</p>
        </div>
        <span style={{ fontSize: 18, color: '#4B5563' }}>→</span>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Replace today-card.tsx**

```typescript
// src/app/(client)/client/dashboard/today-card.tsx
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
          padding: 28,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 28, marginBottom: 10 }}>💤</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#4B5563' }}>
          Hoy es día de descanso
        </p>
        <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
          Recuperate bien. Mañana volvemos.
        </p>
      </div>
    )
  }

  const day = today
  const isCompleted = day.sessionStatus === 'completed'
  const isInProgress = day.sessionStatus === 'in_progress'

  function handleStart() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientPlanDayId', day.clientPlanDayId)
      const result = await startSessionAction(formData)
      if (result.success && result.sessionId) {
        router.push(`/client/training/${result.sessionId}`)
      }
    })
  }

  function handleResume() {
    if (day.existingSessionId) {
      router.push(`/client/training/${day.existingSessionId}`)
    }
  }

  const exerciseCount = day.exercises.length

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: `1px solid ${isCompleted ? 'rgba(181,242,61,0.3)' : isInProgress ? 'rgba(242,153,74,0.3)' : '#1F2227'}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* In-progress banner — prominent */}
      {isInProgress && (
        <div
          style={{
            backgroundColor: 'rgba(242,153,74,0.15)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(242,153,74,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F2994A' }}>
              Tenés un entrenamiento en curso
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              Retomá desde donde dejaste
            </p>
          </div>
          <button
            type="button"
            onClick={handleResume}
            style={{
              padding: '7px 14px',
              backgroundColor: '#F2994A',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Retomar
          </button>
        </div>
      )}

      {/* Completed banner */}
      {isCompleted && (
        <div
          style={{
            backgroundColor: 'rgba(181,242,61,0.1)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(181,242,61,0.15)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: '#B5F23D' }}>
            ✓ Entrenamiento completado
          </p>
        </div>
      )}

      {/* Context: exercise count */}
      <div style={{ padding: '14px 16px' }}>
        {exerciseCount > 0 ? (
          <>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
              {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} planificados
            </p>
            {day.exercises.slice(0, 3).map((ex, i) => (
              <div
                key={ex.clientPlanDayExerciseId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: i > 0 ? '1px solid #1A1D22' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: '#F0F0F0' }}>{ex.name}</span>
                <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0, marginLeft: 8 }}>
                  {ex.plannedSets} ×{' '}
                  {ex.plannedReps != null
                    ? `${ex.plannedReps} reps`
                    : ex.plannedDurationSeconds != null
                    ? `${ex.plannedDurationSeconds}s`
                    : '—'}
                </span>
              </div>
            ))}
            {exerciseCount > 3 && (
              <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>
                +{exerciseCount - 3} ejercicios más
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#4B5563' }}>
            Sin ejercicios planificados para hoy.
          </p>
        )}
      </div>

      {/* CTA — only if not completed and has exercises */}
      {!isCompleted && !isInProgress && exerciseCount > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={handleStart}
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
            {isPending ? 'Cargando...' : 'Empezar entrenamiento'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(client)/client/dashboard/page.tsx src/app/(client)/client/dashboard/today-card.tsx
git commit -m "feat: improve client dashboard (avatar, date, ver plan, nutrition btn, in-progress banner)"
```

---

## Task 6: Plan View

**Files:**
- Create: `src/app/(client)/client/plan/queries.ts`
- Create: `src/app/(client)/client/plan/page.tsx`

- [ ] **Step 1: Create queries.ts**

```typescript
// src/app/(client)/client/plan/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeek, computeDayDate, computeDayStatus } from '@/features/clients/utils/training-utils'
import type { ClientPlanViewData, PlanWeekData, PlanDayWithStatus } from '@/features/training/types'

export async function getClientPlanViewData(
  clientId: string
): Promise<ClientPlanViewData | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, name, weeks, start_date, end_date, status')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return null

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = new Date().toISOString().split('T')[0]
  const progressPct = Math.max(8, Math.round(((currentWeek - 1) / plan.weeks) * 100))

  const [daysResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week')
      .eq('client_plan_id', plan.id)
      .order('week_number')
      .order('day_of_week'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .in('status', ['in_progress', 'completed']),
  ])

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of sessionsResult.data ?? []) {
    sessionByDayId.set(s.client_plan_day_id, { id: s.id, status: s.status })
  }

  const weekMap = new Map<number, PlanDayWithStatus[]>()
  for (const day of daysResult.data ?? []) {
    const dateISO = computeDayDate(plan.start_date, day.week_number, day.day_of_week)
    const session = sessionByDayId.get(day.id)
    const status = computeDayStatus(
      dateISO,
      todayISO,
      (session?.status as 'in_progress' | 'completed' | null) ?? null
    )

    if (!weekMap.has(day.week_number)) weekMap.set(day.week_number, [])
    weekMap.get(day.week_number)!.push({
      clientPlanDayId: day.id,
      weekNumber: day.week_number,
      dayOfWeek: day.day_of_week,
      dateISO,
      status,
      existingSessionId: session?.id ?? null,
    })
  }

  const weeksByNumber: PlanWeekData[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    weeksByNumber.push({ weekNumber: w, days: weekMap.get(w) ?? [] })
  }

  return {
    planId: plan.id,
    planName: plan.name,
    startDate: plan.start_date,
    endDate: plan.end_date,
    weeks: plan.weeks,
    currentWeek,
    progressPct,
    weeksByNumber,
  }
}
```

- [ ] **Step 2: Create page.tsx**

```typescript
// src/app/(client)/client/plan/page.tsx
'use client'

import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Clock } from 'lucide-react'
import type { ClientPlanViewData, PlanDayWithStatus } from '@/features/training/types'
```

Wait — this cannot be a Client Component since it needs `redirect` and `getCurrentUser`. The correct pattern is a Server Component for data loading, and a Client Component for the interactive week navigation. Let me split:

```typescript
// src/app/(client)/client/plan/page.tsx  ← Server Component
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientPlanViewData } from './queries'
import PlanView from './plan-view'

export default async function ClientPlanPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientPlanViewData(user.id)

  if (!data) {
    return (
      <div style={{ padding: '20px 20px 120px' }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 20 }}>
          Mi plan
        </p>
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
            Tu coach todavía no te asignó un plan.
          </p>
        </div>
      </div>
    )
  }

  return <PlanView data={data} />
}
```

- [ ] **Step 3: Create plan-view.tsx (client component)**

```typescript
// src/app/(client)/client/plan/plan-view.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ClientPlanViewData, PlanDayWithStatus } from '@/features/training/types'

const DAY_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function DayStatusIcon({ status }: { status: PlanDayWithStatus['status'] }) {
  if (status === 'completed') {
    return <span style={{ fontSize: 16, color: '#B5F23D' }}>✓</span>
  }
  if (status === 'in_progress') {
    return <span style={{ fontSize: 12, color: '#F2994A', fontWeight: 700 }}>●</span>
  }
  if (status === 'today') {
    return <span style={{ fontSize: 12, color: '#B5F23D', fontWeight: 700 }}>●</span>
  }
  return <span style={{ fontSize: 12, color: '#374151' }}>○</span>
}

export default function PlanView({ data }: { data: ClientPlanViewData }) {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(data.currentWeek)

  const week = data.weeksByNumber.find((w) => w.weekNumber === currentWeek)
  const days = week?.days ?? []

  function formatDateRange(): string {
    if (days.length === 0) return ''
    const first = days[0].dateISO
    const last = days[days.length - 1].dateISO
    return `${formatDateShort(first)} – ${formatDateShort(last)}`
  }

  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Plan header */}
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>
          {data.planName}
        </p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          {new Date(data.startDate + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' → '}
          {new Date(data.endDate + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Progreso general</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B5F23D' }}>
            {data.progressPct}%
          </p>
        </div>
        <div style={{ backgroundColor: '#1F2227', borderRadius: 9999, height: 5, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${data.progressPct}%`,
              backgroundColor: '#B5F23D',
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      {/* Week navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 12,
          padding: '10px 16px',
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
          disabled={currentWeek === 1}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentWeek === 1 ? 'not-allowed' : 'pointer',
            color: currentWeek === 1 ? '#374151' : '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F0' }}>
            Semana {currentWeek} de {data.weeks}
            {currentWeek === data.currentWeek && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#B5F23D',
                  backgroundColor: 'rgba(181,242,61,0.12)',
                  padding: '2px 7px',
                  borderRadius: 9999,
                }}
              >
                HOY
              </span>
            )}
          </p>
          {formatDateRange() && (
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              {formatDateRange()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCurrentWeek((w) => Math.min(data.weeks, w + 1))}
          disabled={currentWeek === data.weeks}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentWeek === data.weeks ? 'not-allowed' : 'pointer',
            color: currentWeek === data.weeks ? '#374151' : '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Days list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {days.length === 0 ? (
          <p style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', padding: 20 }}>
            No hay días de entrenamiento esta semana.
          </p>
        ) : (
          days.map((day) => (
            <button
              key={day.clientPlanDayId}
              type="button"
              onClick={() =>
                router.push(`/client/plan/${day.weekNumber}/${day.clientPlanDayId}`)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#111317',
                border: `1px solid ${
                  day.status === 'completed'
                    ? 'rgba(181,242,61,0.25)'
                    : day.status === 'today'
                    ? 'rgba(181,242,61,0.4)'
                    : day.status === 'in_progress'
                    ? 'rgba(242,153,74,0.3)'
                    : '#1F2227'
                }`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: day.status === 'completed' ? '#B5F23D' : day.status === 'today' ? '#F0F0F0' : '#9CA3AF',
                  }}
                >
                  {DAY_SHORT[day.dayOfWeek]}
                  {day.status === 'today' && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#B5F23D', fontWeight: 700 }}>
                      HOY
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {formatDateShort(day.dateISO)}
                </p>
              </div>
              <DayStatusIcon status={day.status} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(client)/client/plan/
git commit -m "feat: add client plan view with week navigation"
```

---

## Task 7: Day Detail

**Files:**
- Create: `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts`
- Create: `src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/page.tsx`

- [ ] **Step 1: Create queries.ts**

```typescript
// src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/queries.ts
import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { DayDetailData, DayExerciseDetail } from '@/features/training/types'

export async function getDayDetailData(
  clientPlanDayId: string,
  clientId: string
): Promise<DayDetailData | null> {
  const supabase = await createClient()

  type DayRow = {
    id: string
    week_number: number
    day_of_week: number
    client_plans: { client_id: string; start_date: string } | null
  }

  const { data: day } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week, client_plans(client_id, start_date)')
    .eq('id', clientPlanDayId)
    .single()

  const dayRow = day as DayRow | null
  if (!dayRow || dayRow.client_plans?.client_id !== clientId) return null

  const startDate = dayRow.client_plans!.start_date
  const dateISO = computeDayDate(startDate, dayRow.week_number, dayRow.day_of_week)

  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
      )
      .eq('client_plan_day_id', clientPlanDayId)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_plan_day_id', clientPlanDayId)
      .eq('client_id', clientId)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps: number | null
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

  const exercises: DayExerciseDetail[] = (
    (exercisesResult.data as ExRow[]) ?? []
  ).map((ex) => ({
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
    videoUrl: ex.exercises?.video_url ?? null,
  }))

  return {
    clientPlanDayId,
    weekNumber: dayRow.week_number,
    dayOfWeek: dayRow.day_of_week,
    dateISO,
    exercises,
    sessionId: sessionResult.data?.id ?? null,
    sessionStatus:
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }
}
```

- [ ] **Step 2: Create page.tsx**

```typescript
// src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { getDayDetailData } from './queries'
import DayDetailClient from './day-detail-client'

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string; clientPlanDayId: string }>
}) {
  const { weekNumber, clientPlanDayId } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getDayDetailData(clientPlanDayId, user.id)
  if (!data) notFound()

  return (
    <div style={{ padding: '0 0 120px' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/client/plan"
          style={{
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          ←
        </Link>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
            {['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][data.dayOfWeek]}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280' }}>
            Semana {data.weekNumber} ·{' '}
            {new Date(data.dateISO + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        {data.sessionStatus === 'completed' && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 9999,
              backgroundColor: 'rgba(181,242,61,0.12)',
              color: '#B5F23D',
            }}
          >
            Completado
          </span>
        )}
      </div>

      <DayDetailClient data={data} />
    </div>
  )
}
```

- [ ] **Step 3: Create day-detail-client.tsx**

```typescript
// src/app/(client)/client/plan/[weekNumber]/[clientPlanDayId]/day-detail-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import VideoModal from '@/components/ui/video-modal'
import type { DayDetailData } from '@/features/training/types'

export default function DayDetailClient({ data }: { data: DayDetailData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const isToday = data.dateISO === new Date().toISOString().split('T')[0]
  const isCompleted = data.sessionStatus === 'completed'
  const isInProgress = data.sessionStatus === 'in_progress'

  function handleStart() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientPlanDayId', data.clientPlanDayId)
      const result = await startSessionAction(formData)
      if (result.success && result.sessionId) {
        router.push(`/client/training/${result.sessionId}`)
      }
    })
  }

  function handleResume() {
    if (data.sessionId) {
      router.push(`/client/training/${data.sessionId}`)
    }
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.exercises.length === 0 ? (
        <p style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', padding: 20 }}>
          Sin ejercicios para este día.
        </p>
      ) : (
        data.exercises.map((ex) => (
          <div
            key={ex.clientPlanDayExerciseId}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F0' }}>{ex.name}</p>
                {ex.muscleGroup && (
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{ex.muscleGroup}</p>
                )}
              </div>
              {ex.videoUrl && (
                <button
                  type="button"
                  onClick={() => setVideoUrl(ex.videoUrl)}
                  style={{
                    background: 'none',
                    border: '1px solid #2A2D34',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: '#B5F23D',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    flexShrink: 0,
                    marginLeft: 10,
                  }}
                >
                  Video
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              {ex.plannedSets} series ×{' '}
              {ex.plannedReps != null
                ? `${ex.plannedReps} reps`
                : ex.plannedDurationSeconds != null
                ? `${ex.plannedDurationSeconds}s`
                : '—'}
              {ex.restSeconds != null ? ` · ${ex.restSeconds}s descanso` : ''}
            </p>
          </div>
        ))
      )}

      {/* CTA */}
      {isToday && !isCompleted && data.exercises.length > 0 && (
        <button
          type="button"
          onClick={isInProgress ? handleResume : handleStart}
          disabled={isPending}
          style={{
            marginTop: 8,
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
            : 'Empezar entrenamiento'}
        </button>
      )}

      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(client)/client/plan/"
git commit -m "feat: add day detail screen with exercises and video support"
```

---

## Task 8: Live Training Redesign — Step by Step

**Files:**
- Modify: `src/app/(training)/client/training/[sessionId]/queries.ts`
- Modify: `src/app/(training)/client/training/[sessionId]/live-training.tsx`

- [ ] **Step 1: Update queries.ts to include video_url**

In `src/app/(training)/client/training/[sessionId]/queries.ts`, change the exercises select to include `video_url`:

Find:
```typescript
'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type)'
```

Replace with:
```typescript
'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
```

Also update the `ExRow` type and mapping to include `video_url`:

In the `ExRow` type, add:
```typescript
exercises: { id: string; name: string; muscle_group: string; type: string; video_url: string | null } | null
```

In the mapping, add:
```typescript
videoUrl: ex.exercises?.video_url ?? null,
```

- [ ] **Step 2: Replace live-training.tsx with step-by-step version**

```typescript
// src/app/(training)/client/training/[sessionId]/live-training.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import VideoModal from '@/components/ui/video-modal'
import type { LiveSessionData } from '@/features/training/types'

type SetInputs = { weight: string; duration: string }

function makeKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

export default function LiveTraining({ session }: { session: LiveSessionData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFinished, setIsFinished] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // Start at first exercise with incomplete sets
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    for (let i = 0; i < session.exercises.length; i++) {
      const ex = session.exercises[i]
      const allDone = Array.from({ length: ex.plannedSets }, (_, j) => j + 1).every(
        (n) => ex.loggedSets.find((s) => s.setNumber === n)?.completed
      )
      if (!allDone) return i
    }
    return session.exercises.length - 1
  })

  const [localCompleted, setLocalCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
      }
    }
    return s
  })

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

  const currentEx = session.exercises[currentIndex]
  const setNumbers = Array.from({ length: currentEx.plannedSets }, (_, i) => i + 1)
  const allCurrentDone = setNumbers.every((n) =>
    localCompleted.has(makeKey(currentEx.clientPlanDayExerciseId, n))
  )
  const isLastExercise = currentIndex === session.exercises.length - 1
  const isFirstExercise = currentIndex === 0

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

  function handleCompleteSet(setNumber: number) {
    const key = makeKey(currentEx.clientPlanDayExerciseId, setNumber)
    const inp = getInput(currentEx.clientPlanDayExerciseId, setNumber)

    setLocalCompleted((prev) => new Set([...prev, key]))

    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', currentEx.clientPlanDayExerciseId)
      formData.set('setNumber', String(setNumber))
      if (currentEx.type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
      if (currentEx.type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)

      const result = await completeSetAction(formData)
      if (result.error) {
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
      setIsFinished(true)
    })
  }

  // Finished screen
  if (isFinished) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          gap: 20,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 52 }}>🏆</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F0' }}>
          ¡Entrenamiento completado!
        </p>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Excelente trabajo. Seguí así.</p>
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            marginTop: 8,
            padding: '14px 32px',
            backgroundColor: '#B5F23D',
            color: '#0A0A0A',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

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
          <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>
            Ejercicio {currentIndex + 1} de {session.exercises.length}
          </p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0', marginTop: 1 }}>
            {currentEx.name}
          </p>
          {currentEx.muscleGroup && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              {currentEx.muscleGroup}
            </p>
          )}
        </div>
        {currentEx.videoUrl && (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            style={{
              background: 'none',
              border: '1px solid #2A2D34',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#B5F23D',
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 10px',
              flexShrink: 0,
            }}
          >
            Video
          </button>
        )}
      </div>

      {/* Planned info */}
      {(currentEx.plannedReps != null || currentEx.plannedDurationSeconds != null) && (
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: 'rgba(181,242,61,0.06)',
            borderBottom: '1px solid #1F2227',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>
            Objetivo: {currentEx.plannedSets} series ×{' '}
            {currentEx.plannedReps != null
              ? `${currentEx.plannedReps} reps`
              : `${currentEx.plannedDurationSeconds}s`}
            {currentEx.restSeconds != null ? ` · ${currentEx.restSeconds}s descanso` : ''}
          </p>
        </div>
      )}

      {/* Sets list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {setNumbers.map((setNum) => {
          const key = makeKey(currentEx.clientPlanDayExerciseId, setNum)
          const isDone = localCompleted.has(key)
          const inp = getInput(currentEx.clientPlanDayExerciseId, setNum)

          return (
            <div
              key={setNum}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#111317',
                border: `1px solid ${isDone ? 'rgba(181,242,61,0.3)' : '#1F2227'}`,
                borderRadius: 12,
                padding: '12px 16px',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  minWidth: 58,
                  flexShrink: 0,
                }}
              >
                Serie {setNum}
              </span>

              {isDone ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                    {currentEx.type === 'strength'
                      ? `${inp.weight || '—'} kg × ${currentEx.plannedReps ?? '—'} reps`
                      : `${inp.duration || '—'} seg`}
                  </span>
                  <span
                    style={{ fontSize: 14, color: '#B5F23D', marginLeft: 'auto' }}
                  >
                    ✓
                  </span>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentEx.type === 'strength' ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="kg"
                      value={inp.weight}
                      onChange={(e) =>
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
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
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
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
                    onClick={() => handleCompleteSet(setNum)}
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

      {/* Bottom navigation */}
      <div
        style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid #1F2227',
          display: 'flex',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirstExercise}
          style={{
            padding: '12px 14px',
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 12,
            color: isFirstExercise ? '#374151' : '#9CA3AF',
            cursor: isFirstExercise ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={16} />
          Ant.
        </button>

        {isLastExercise ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending || !allCurrentDone}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor:
                allCurrentDone && !isPending ? '#B5F23D' : '#111317',
              border: `1px solid ${allCurrentDone ? '#B5F23D' : '#1F2227'}`,
              borderRadius: 12,
              color: allCurrentDone && !isPending ? '#0A0A0A' : '#374151',
              fontWeight: 700,
              fontSize: 14,
              cursor:
                allCurrentDone && !isPending ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? 'Guardando...' : '✓ Finalizar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={!allCurrentDone}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: '#111317',
              border: `1px solid ${allCurrentDone ? '#B5F23D' : '#1F2227'}`,
              borderRadius: 12,
              color: allCurrentDone ? '#B5F23D' : '#374151',
              fontWeight: 600,
              fontSize: 14,
              cursor: allCurrentDone ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        )}
      </div>

      {showVideo && currentEx.videoUrl && (
        <VideoModal url={currentEx.videoUrl} onClose={() => setShowVideo(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(training)/client/training/[sessionId]/"
git commit -m "feat: redesign live training to step-by-step exercise flow with video support"
```

---

## Task 9: History Redesign — Weekly

**Files:**
- Modify: `src/app/(client)/client/history/queries.ts`
- Modify: `src/app/(client)/client/history/page.tsx`

- [ ] **Step 1: Replace history/queries.ts**

```typescript
// src/app/(client)/client/history/queries.ts
import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { WeekHistorySummary } from '@/features/training/types'

export async function getWeeklyHistorySummaries(
  clientId: string
): Promise<WeekHistorySummary[]> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return []

  const [daysResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week')
      .eq('client_plan_id', plan.id)
      .order('week_number')
      .order('day_of_week'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .eq('status', 'completed'),
  ])

  const completedDayIds = new Set<string>(
    (sessionsResult.data ?? []).map((s) => s.client_plan_day_id)
  )

  // Count total training days per week
  const totalByWeek = new Map<number, number>()
  const completedByWeek = new Map<number, number>()
  for (const day of daysResult.data ?? []) {
    totalByWeek.set(day.week_number, (totalByWeek.get(day.week_number) ?? 0) + 1)
    if (completedDayIds.has(day.id)) {
      completedByWeek.set(
        day.week_number,
        (completedByWeek.get(day.week_number) ?? 0) + 1
      )
    }
  }

  const result: WeekHistorySummary[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    const completed = completedByWeek.get(w) ?? 0
    if (completed === 0) continue // only show weeks with at least 1 completed day
    const total = totalByWeek.get(w) ?? 0
    result.push({
      weekNumber: w,
      dateRangeStart: computeDayDate(plan.start_date, w, 1),
      dateRangeEnd: computeDayDate(plan.start_date, w, 7),
      completedDays: completed,
      totalTrainingDays: total,
      compliancePct: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  }

  return result.sort((a, b) => b.weekNumber - a.weekNumber)
}
```

- [ ] **Step 2: Replace history/page.tsx**

```typescript
// src/app/(client)/client/history/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getWeeklyHistorySummaries } from './queries'

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sStr = s.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  const eStr = e.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return `${sStr} – ${eStr}`
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const weeks = await getWeeklyHistorySummaries(user.id)

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Historial</p>

      {weeks.length === 0 ? (
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
            Todavía no completaste ninguna semana.
          </p>
          <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
            ¡Empezá hoy!
          </p>
        </div>
      ) : (
        weeks.map((week) => (
          <Link
            key={week.weekNumber}
            href={`/client/history/week/${week.weekNumber}`}
            style={{ textDecoration: 'none' }}
          >
            <div
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
                  Semana {week.weekNumber}
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
                  {formatDateRange(week.dateRangeStart, week.dateRangeEnd)}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {week.completedDays} de {week.totalTrainingDays} días
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: week.compliancePct >= 80 ? '#B5F23D' : week.compliancePct >= 50 ? '#F2994A' : '#F25252',
                  }}
                >
                  {week.compliancePct}%
                </p>
                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  cumplimiento
                </p>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(client)/client/history/
git commit -m "feat: redesign history as weekly summaries with compliance percentage"
```

---

## Task 10: History Week Detail

**Files:**
- Create: `src/app/(client)/client/history/week/[weekNumber]/queries.ts`
- Create: `src/app/(client)/client/history/week/[weekNumber]/page.tsx`
- Create: `src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx`

- [ ] **Step 1: Create queries.ts**

```typescript
// src/app/(client)/client/history/week/[weekNumber]/queries.ts
import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { WeekDetailData, WeekDetailSession, WeekDetailExercise, WeekDetailSet } from '@/features/training/types'

export async function getWeekDetailData(
  clientId: string,
  weekNumber: number
): Promise<WeekDetailData | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan || weekNumber < 1 || weekNumber > plan.weeks) return null

  // Days for this week
  const { data: days } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week')
    .eq('client_plan_id', plan.id)
    .eq('week_number', weekNumber)
    .order('day_of_week')

  if (!days || days.length === 0) return null

  const dayIds = days.map((d) => d.id)

  // Sessions for these days
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status, completed_at')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .in('client_plan_day_id', dayIds)

  if (!sessions || sessions.length === 0) {
    return {
      weekNumber,
      dateRangeStart: computeDayDate(plan.start_date, weekNumber, 1),
      dateRangeEnd: computeDayDate(plan.start_date, weekNumber, 7),
      sessions: [],
    }
  }

  const sessionIds = sessions.map((s) => s.id)

  // All session_sets for these sessions, joined with exercise info
  const { data: setsData } = await supabase
    .from('session_sets')
    .select(
      'session_id, set_number, weight_kg, duration_seconds, completed, client_plan_day_exercise_id, client_plan_day_exercises(order, sets, reps, duration_seconds, exercises(name, muscle_group, type))'
    )
    .in('session_id', sessionIds)
    .order('set_number')

  type SetRow = {
    session_id: string
    set_number: number
    weight_kg: number | null
    duration_seconds: number | null
    completed: boolean
    client_plan_day_exercise_id: string
    client_plan_day_exercises: {
      order: number
      sets: number
      reps: number | null
      duration_seconds: number | null
      exercises: { name: string; muscle_group: string; type: string } | null
    } | null
  }

  // Group sets by session_id, then by exercise
  const setsBySession = new Map<string, SetRow[]>()
  for (const row of (setsData as SetRow[]) ?? []) {
    if (!setsBySession.has(row.session_id)) setsBySession.set(row.session_id, [])
    setsBySession.get(row.session_id)!.push(row)
  }

  const dayById = new Map(days.map((d) => [d.id, d]))

  const detailSessions: WeekDetailSession[] = sessions.map((sess) => {
    const dayInfo = dayById.get(sess.client_plan_day_id)
    const dateISO = dayInfo
      ? computeDayDate(plan.start_date, weekNumber, dayInfo.day_of_week)
      : sess.client_plan_day_id

    const sessionSets = setsBySession.get(sess.id) ?? []

    // Group by exercise (client_plan_day_exercise_id)
    const exerciseMap = new Map<string, SetRow[]>()
    for (const row of sessionSets) {
      if (!exerciseMap.has(row.client_plan_day_exercise_id))
        exerciseMap.set(row.client_plan_day_exercise_id, [])
      exerciseMap.get(row.client_plan_day_exercise_id)!.push(row)
    }

    const exercises: WeekDetailExercise[] = Array.from(exerciseMap.entries())
      .map(([exId, rows]) => {
        const sample = rows[0]
        const exInfo = sample.client_plan_day_exercises
        return {
          clientPlanDayExerciseId: exId,
          name: exInfo?.exercises?.name ?? 'Ejercicio',
          muscleGroup: exInfo?.exercises?.muscle_group ?? '',
          type: (exInfo?.exercises?.type as 'strength' | 'cardio') ?? 'strength',
          plannedReps: exInfo?.reps ?? null,
          plannedDurationSeconds: exInfo?.duration_seconds ?? null,
          sets: rows
            .sort((a, b) => a.set_number - b.set_number)
            .map((r): WeekDetailSet => ({
              setNumber: r.set_number,
              weightKg: r.weight_kg,
              durationSeconds: r.duration_seconds,
              completed: r.completed,
            })),
        }
      })
      .sort((a, b) => {
        const aRow = [...exerciseMap.get(a.clientPlanDayExerciseId)!][0]
        const bRow = [...exerciseMap.get(b.clientPlanDayExerciseId)!][0]
        return (aRow.client_plan_day_exercises?.order ?? 0) - (bRow.client_plan_day_exercises?.order ?? 0)
      })

    return {
      sessionId: sess.id,
      clientPlanDayId: sess.client_plan_day_id,
      dayOfWeek: dayInfo?.day_of_week ?? 0,
      dateISO,
      completedAt: sess.completed_at,
      exercises,
    }
  })

  detailSessions.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return {
    weekNumber,
    dateRangeStart: computeDayDate(plan.start_date, weekNumber, 1),
    dateRangeEnd: computeDayDate(plan.start_date, weekNumber, 7),
    sessions: detailSessions,
  }
}
```

- [ ] **Step 2: Create week-detail-client.tsx**

```typescript
// src/app/(client)/client/history/week/[weekNumber]/week-detail-client.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { WeekDetailData, WeekDetailSession } from '@/features/training/types'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function SessionCard({ session }: { session: WeekDetailSession }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid rgba(181,242,61,0.2)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
            {DAY_NAMES[session.dayOfWeek]}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {new Date(session.dateISO + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
            {' · '}
            {session.exercises.length}{' '}
            {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#B5F23D' }}>✓</span>
          {open ? (
            <ChevronUp size={16} color="#6B7280" />
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #1F2227', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {session.exercises.map((ex) => (
            <div key={ex.clientPlanDayExerciseId}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0', marginBottom: 6 }}>
                {ex.name}
                {ex.muscleGroup && (
                  <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400, marginLeft: 6 }}>
                    {ex.muscleGroup}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ex.sets.map((set) => (
                  <div
                    key={set.setNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      backgroundColor: set.completed ? 'rgba(181,242,61,0.06)' : '#0F1014',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#6B7280', minWidth: 50 }}>
                      Serie {set.setNumber}
                    </span>
                    <span style={{ fontSize: 13, color: '#9CA3AF', flex: 1 }}>
                      {ex.type === 'strength'
                        ? set.weightKg != null
                          ? `${set.weightKg} kg × ${ex.plannedReps ?? '—'} reps`
                          : `— × ${ex.plannedReps ?? '—'} reps`
                        : set.durationSeconds != null
                        ? `${set.durationSeconds} seg`
                        : '—'}
                    </span>
                    {set.completed && (
                      <span style={{ fontSize: 12, color: '#B5F23D' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeekDetailClient({ data }: { data: WeekDetailData }) {
  function formatRange(): string {
    const s = new Date(data.dateRangeStart + 'T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    })
    const e = new Date(data.dateRangeEnd + 'T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    })
    return `${s} – ${e}`
  }

  return (
    <div style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#6B7280' }}>{formatRange()}</p>
      {data.sessions.length === 0 ? (
        <p style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', padding: 20 }}>
          Sin sesiones completadas esta semana.
        </p>
      ) : (
        data.sessions.map((sess) => (
          <SessionCard key={sess.sessionId} session={sess} />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create page.tsx**

```typescript
// src/app/(client)/client/history/week/[weekNumber]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { getWeekDetailData } from './queries'
import WeekDetailClient from './week-detail-client'

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const num = parseInt(weekNumber, 10)
  if (isNaN(num) || num < 1) notFound()

  const data = await getWeekDetailData(user.id, num)
  if (!data) notFound()

  return (
    <div>
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/client/history"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ←
        </Link>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0' }}>
          Semana {data.weekNumber}
        </p>
      </div>

      <WeekDetailClient data={data} />
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(client)/client/history/"
git commit -m "feat: add history week detail with expandable session cards"
```

---

## Task 11: Nutrition Page

**Files:**
- Create: `src/app/(client)/client/nutrition/page.tsx`

- [ ] **Step 1: Create nutrition page**

```typescript
// src/app/(client)/client/nutrition/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function NutritionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Nutrición</p>

      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 36 }}>🥗</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0' }}>
          Sin recomendaciones todavía
        </p>
        <p style={{ fontSize: 13, color: '#4B5563', maxWidth: 260 }}>
          Tu coach aún no cargó recomendaciones de nutrición. Cuando lo haga, las vas a ver acá.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(client)/client/nutrition/page.tsx
git commit -m "feat: add nutrition page with empty state"
```

---

## Task 12: Settings Page

**Files:**
- Create: `src/features/training/actions/save-notification-prefs.ts`
- Create: `src/app/(client)/client/settings/notification-toggles.tsx`
- Create: `src/app/(client)/client/settings/page.tsx`

- [ ] **Step 1: Create save-notification-prefs action**

```typescript
// src/features/training/actions/save-notification-prefs.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveNotificationPrefsAction(
  reminders: boolean,
  coachMsgs: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        client_id: user.id,
        reminders,
        coach_msgs: coachMsgs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )

  if (error) return { error: 'Error al guardar preferencias' }
  return { success: true }
}
```

- [ ] **Step 2: Create notification-toggles.tsx (client component)**

```typescript
// src/app/(client)/client/settings/notification-toggles.tsx
'use client'

import { useState, useTransition } from 'react'
import { saveNotificationPrefsAction } from '@/features/training/actions/save-notification-prefs'
import type { NotificationPrefs } from '@/features/training/types'

function Toggle({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string
  sublabel?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
      }}
    >
      <div>
        <p style={{ fontSize: 14, color: '#F0F0F0' }}>{label}</p>
        {sublabel && (
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 9999,
          backgroundColor: checked ? '#B5F23D' : '#1F2227',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
          transition: 'background-color 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: checked ? '#0A0A0A' : '#4B5563',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}

export default function NotificationToggles({
  initial,
}: {
  initial: NotificationPrefs
}) {
  const [reminders, setReminders] = useState(initial.reminders)
  const [coachMsgs, setCoachMsgs] = useState(initial.coachMsgs)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleChange(field: 'reminders' | 'coachMsgs', value: boolean) {
    if (field === 'reminders') setReminders(value)
    else setCoachMsgs(value)

    setSaved(false)
    startTransition(async () => {
      const r = field === 'reminders' ? value : reminders
      const c = field === 'coachMsgs' ? value : coachMsgs
      await saveNotificationPrefsAction(r, c)
      setSaved(true)
    })
  }

  return (
    <div>
      <Toggle
        label="Recordatorios de entrenamiento"
        sublabel="Recordatorio diario en días de entrenamiento"
        checked={reminders}
        onChange={(v) => handleChange('reminders', v)}
      />
      <div style={{ height: 1, backgroundColor: '#1F2227' }} />
      <Toggle
        label="Mensajes del coach"
        sublabel="Notificaciones cuando tu coach escribe"
        checked={coachMsgs}
        onChange={(v) => handleChange('coachMsgs', v)}
      />
      {saved && !isPending && (
        <p style={{ fontSize: 11, color: '#B5F23D', marginTop: 4 }}>
          Preferencias guardadas
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create settings page.tsx**

```typescript
// src/app/(client)/client/settings/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ClientAvatar from '@/components/ui/client-avatar'
import NotificationToggles from './notification-toggles'
import { signOut } from '@/features/auth/actions/sign-out'
import type { NotificationPrefs } from '@/features/training/types'

async function getSettingsData(userId: string) {
  const supabase = await createClient()

  const [profileResult, clientProfileResult, prefsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single(),
    supabase
      .from('client_profiles')
      .select('goal')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('notification_preferences')
      .select('reminders, coach_msgs')
      .eq('client_id', userId)
      .maybeSingle(),
  ])

  return {
    fullName: profileResult.data?.full_name ?? '',
    email: profileResult.data?.email ?? '',
    goal: clientProfileResult.data?.goal ?? null,
    prefs: {
      reminders: prefsResult.data?.reminders ?? true,
      coachMsgs: prefsResult.data?.coach_msgs ?? true,
    } as NotificationPrefs,
  }
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getSettingsData(user.id)

  const SECTION_LABEL: React.CSSProperties = {
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
        padding: '24px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Ajustes</p>

      {/* Profile */}
      <div>
        <p style={SECTION_LABEL}>Perfil</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <ClientAvatar name={data.fullName} size={52} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
                {data.fullName}
              </p>
              {data.goal && (
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  🎯 {data.goal}
                </p>
              )}
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#0F1014',
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 11, color: '#4B5563', marginBottom: 2 }}>Email</p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>{data.email || user.email}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <p style={SECTION_LABEL}>Notificaciones</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: '0 16px',
          }}
        >
          <NotificationToggles initial={data.prefs} />
        </div>
      </div>

      {/* Sign out */}
      <div>
        <p style={SECTION_LABEL}>Cuenta</p>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 14,
              backgroundColor: 'rgba(242,82,82,0.1)',
              border: '1px solid rgba(242,82,82,0.2)',
              borderRadius: 14,
              color: '#F25252',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 6: Run tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1 | tail -5
```
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/training/actions/save-notification-prefs.ts "src/app/(client)/client/settings/"
git commit -m "feat: add client settings page with notification preferences and profile"
```

---

## Final Verification

- [ ] **Full TypeScript check**

```bash
cd "C:\Users\herna\Loboost App" && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Run all tests**

```bash
cd "C:\Users\herna\Loboost App" && npx jest --no-coverage 2>&1 | tail -10
```
Expected: all suites pass.

- [ ] **Smoke test checklist**

1. Login como cliente → dashboard muestra avatar + fecha + plan + "Hoy" + botón nutrición
2. "Ver plan →" → `/client/plan` con semanas navegables
3. Tap un día → ejercicios con series y (si aplica) botón Video
4. "Empezar entrenamiento" → live training paso a paso, un ejercicio por vez
5. Completar todas las series → "Siguiente ejercicio" se activa → navegar hasta el último → "Finalizar"
6. Volver al dashboard → historial → semanas con % cumplimiento
7. Tap una semana → días expandibles con series y pesos
8. Ajustes → perfil + toggles de notificación → al cambiar toggle se guarda en DB
9. Bottom nav: 4 items funcionan correctamente
