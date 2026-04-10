# Perfil del Cliente — Design Spec

## Goal

Build `/coach/clients/[id]` — the central hub the coach uses to monitor a client's training. The screen presents everything needed at a glance: who the client is, how they're training this week, their active plan, their physical data, and private coach notes.

The training tracking section is the focal point: the coach can navigate any week of the plan, tap any day, and see the full exercise log with every set, weight, and rep the client recorded.

---

## Architecture

### File map

```
src/app/(coach)/coach/clients/[id]/
  page.tsx                        Server Component — auth, fetches all data, composes page
  queries.ts                      DB queries (no 'use server' — called from page.tsx server-side)
  actions.ts                      'use server' — getWeekTrainingData (for client nav) + saveCoachNoteAction
  client-profile-header.tsx       'use client' — sticky header with name/goal/status
  kpi-strip.tsx                   Server Component — 3 stat cards (compliance, last session, total)
  training-week.tsx               'use client' — week navigator + day strip + day detail card
  plan-card.tsx                   Server Component — active plan info + progress bar
  physical-profile.tsx            Server Component — fitness data grid
  coach-notes.tsx                 'use client' — view/edit notes textarea

src/features/clients/
  types.ts                        Add: TrainingWeekData, DayTrainingData, ExerciseWithSets
```

### Data flow

`page.tsx` runs on the server and fetches everything in parallel:
- Profile + client_profile data
- Active client_plan
- Current week's training data (week number calculated from today vs start_date)
- Compliance + last session stats (last 7 days)
- Total sessions count
- Coach notes

All data is passed as props to child components. `training-week.tsx` receives the current week data as initial state and fetches subsequent weeks client-side via the `getWeekTrainingData` Server Action when the coach navigates weeks.

---

## Types (add to `src/features/clients/types.ts`)

```typescript
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
  sessionSets: SessionSetData[]  // empty if session not started
}

export type DayStatus = 'completed' | 'in_progress' | 'today' | 'upcoming' | 'past_missed' | 'rest'

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
  days: DayTrainingData[]     // always 7 items, one per day of week
}

export type ClientProfileData = {
  id: string
  fullName: string
  goal: string | null
  statusColor: 'active' | 'warning' | 'critical'
  // KPIs
  weeklyCompliance: number
  daysSinceLastSession: number | null
  totalSessions: number
  // Physical
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  injuries: string | null
  // Plan
  activePlan: {
    id: string
    name: string
    weeks: number
    startDate: string
    endDate: string
    status: 'active' | 'completed' | 'paused'
    currentWeek: number
  } | null
  // Training week (current)
  currentWeekData: TrainingWeekData | null
  // Notes
  coachNote: string
}
```

---

## Queries (`queries.ts`)

### `getClientProfileData(clientId, coachId)`

Single entry point that fetches everything for the page. Runs these in parallel:
1. `profiles` + `client_profiles` — personal and fitness data
2. `client_plans` where `client_id = clientId AND status = 'active'` — active plan
3. `sessions` last 14 days — for compliance + last session + sparkline
4. `sessions` count all completed — total sessions
5. `coach_notes` where `coach_id = coachId AND client_id = clientId` — latest note

After fetching the active plan, calculates `currentWeek`:
```typescript
function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const start = new Date(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  if (today < start) return 1
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}
```

### `getWeekTrainingData(clientPlanId, weekNumber, startDate, totalWeeks)` — also exported as Server Action in `actions.ts`

The query logic lives in `queries.ts`. `actions.ts` wraps it with `'use server'` so `training-week.tsx` can call it directly during week navigation.

Returns `TrainingWeekData` for one week. Steps:
1. Query `client_plan_days` where `client_plan_id = clientPlanId AND week_number = weekNumber`
2. For each day, query `client_plan_day_exercises` joined with `exercises` (name)
3. For each day, query `sessions` where `client_plan_day_id = dayId`
4. For sessions that exist, query `session_sets` ordered by `set_number`
5. Compute `date` for each day: `new Date(startDate) + (weekNumber-1)*7 + (dayOfWeek-1) days`
6. Compute `DayStatus` for each day:
   - If no `client_plan_day` → `'rest'`
   - If session.status = 'completed' → `'completed'`
   - If session.status = 'in_progress' → `'in_progress'`
   - If date === today (ISO) and no session → `'today'`
   - If date > today → `'upcoming'`
   - If date < today and no session → `'past_missed'`
7. Build 7-element array (one per day of week), filling rest days with empty DayTrainingData

This function is also exported as a Server Action for client-side week navigation.

---

## Components

### `page.tsx`
```typescript
export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  // 1. Auth + coach role check
  // 2. getClientProfileData(params.id, coachUser.id)
  // 3. If client not found or not owned by coach: notFound()
  // 4. Render all sections
}
```

### `client-profile-header.tsx` (`'use client'`)

Sticky header (`position: sticky, top: 0, zIndex: 40, backgroundColor: '#0A0A0A'`).

Layout:
```
[ ← ]  [ Avatar lg ]  [ Name         ]  [ status badge ]
                       [ goal (muted) ]
```

- Back arrow (`ChevronLeft`) links to `/coach/clients`
- `Avatar` size `lg` (52px) — already exists
- Status badge: pill with color from `statusColor` (`#B5F23D` active / `#F2994A` warning / `#F25252` critical)
- Status label text: "Activo" / "Atención" / "Inactivo"
- Subtle bottom border `1px solid #1F2227` visible when scrolled (use `scrollY > 0` with `useEffect`)

Props: `fullName`, `goal`, `statusColor`

### `kpi-strip.tsx` (Server Component)

Reuses `StatCard` from `src/components/ui/stat-card.tsx`.

Three cards in a row:
- **Cumplimiento** — `weeklyCompliance`% with color: `#B5F23D` if ≥70, `#F2994A` if ≥40, `#F25252` if <40
- **Última sesión** — "hace X días" or "Hoy" or "Sin sesiones" — muted if null
- **Sesiones totales** — integer count

Props: `weeklyCompliance`, `daysSinceLastSession`, `totalSessions`

### `training-week.tsx` (`'use client'`) — THE MAIN COMPONENT

**State:**
- `weekData: TrainingWeekData` — starts from server prop
- `selectedDayOfWeek: number` — defaults to smart selection (see below)
- `loading: boolean` — during week navigation fetch

**Smart default day selection:**
On mount, select:
1. Today's `dayOfWeek` if its status is `'today'` or `'in_progress'`
2. Otherwise, the most recent `'completed'` day in the current week
3. Otherwise, the first `'upcoming'` day
4. Otherwise, day 1

**Week navigation:**
- `‹` and `›` buttons, disabled at week 1 / week N
- On click: `setLoading(true)`, call `getWeekTrainingData` Server Action, `setWeekData(result)`, `setLoading(false)`
- Loading state: day strip shows skeleton shimmer (opacity pulse via `animate-pulse` CSS or framer-motion)

**Day strip:**

7 pills horizontally: L M X J V S D. Each pill:
- Width: `flex: 1`, height 36px, `borderRadius: 9999`
- Rest day: invisible/no pill — just an empty flex cell with the letter in very muted gray
- Training day pill styling by status:
  - `completed`: filled `#B5F23D`, text `#0A0A0A`
  - `in_progress`: filled `#F2994A`, text `#0A0A0A`, pulsing ring animation
  - `today`: border `#F0F0F0`, text `#F0F0F0` (unfilled)
  - `upcoming`: border `#2A2D34`, text `#4B5563`
  - `past_missed`: border `#F25252` dashed (using `outline`), text `#F25252`
- Selected pill has an extra ring: `boxShadow: '0 0 0 2px #B5F23D'`
- Day letter below the pill: `fontSize: 10`, matching color

**Day detail card:**

Animated with `AnimatePresence` + `motion.div` (fade + slight y slide). Key = `dayOfWeek` so it re-animates on day change.

Structure varies by status:

**rest:**
```
Día de descanso  💤
```
Centered, muted text, subtle icon.

**upcoming / today (no session yet):**
```
Entrenamiento planificado
──────────────────────────
Press de banca         3 × 10
Sentadilla             4 × 8
Peso muerto            3 × 6
```
Each row: exercise name left, `sets × reps` right (or `sets × Xs` for duration). Light dividers between exercises.

**completed / in_progress:**
```
Completado · 12 min  ✓        (or "En progreso")
──────────────────────────────────────────────
Press de banca
  Serie 1   60 kg × 10 reps  ✓
  Serie 2   65 kg × 8 reps   ✓
  Serie 3   65 kg × 7 reps   ✓

Sentadilla
  Serie 1   80 kg × 8 reps   ✓
  ...
```

Exercise name: `fontSize: 13, fontWeight: 600, color: '#F0F0F0'`
Set row: `fontSize: 12, color: '#9CA3AF'`, completed checkmark in `#B5F23D`, incomplete in `#F25252`
Sets stagger in with framer-motion: `delay: index * 0.04`

**past_missed:**
```
No registrado
```
Subtle `#F25252` tint card, "el cliente no registró esta sesión".

### `plan-card.tsx` (Server Component)

Card `#111317` with border. Content:

```
PLAN ACTIVO
─────────────────────────────
Nombre del plan                  [ Activo ]
Semana 3 de 8  ·  15 mar → 10 may

[████████░░░░░░░░░░░░░░░░░░░░░]  37%
```

Progress bar: `#B5F23D` fill, `#1F2227` track, `height: 4px, borderRadius: 9999`.
Progress = `(currentWeek - 1) / totalWeeks * 100` (never 0% even on week 1 → show at least 8px).

If no active plan:
```
Sin plan asignado
[ + Asignar plan ]  (button, disabled for now, styled secondary)
```

### `physical-profile.tsx` (Server Component)

Section title "Perfil físico" in caps muted.

2-column grid of data chips. Each chip:
```
[ icon ]  label
          value
```
Background `#111317`, border `#1F2227`, borderRadius `12`, padding `12px`.

Data items (with lucide icons):
- `Cake` → Edad → "25 años"
- `User` → Sexo → "Femenino" / "Masculino" / "Otro"
- `Scale` → Peso → "65.0 kg"
- `Ruler` → Altura → "165 cm"
- `Dumbbell` → Nivel → "Intermedio"
- `CalendarDays` → Días/sem → "4 días"

If `injuries` is not null/empty, a full-width row below the grid:
```
[ AlertTriangle ]  Lesiones
                   Rodilla derecha
```

### `coach-notes.tsx` (`'use client'`)

Two modes:

**View mode:**
```
NOTAS INTERNAS
──────────────────────────────
Texto de la nota...
                          [ Editar ]
```

**Edit mode:**
```
NOTAS INTERNAS
──────────────────────────────
[ textarea autoHeight ]

[ Cancelar ]  [ Guardar ]
```

On save: calls `saveCoachNoteAction(clientId, content)` via `useTransition` (not `useActionState` — no form here). Optimistic update: immediately shows new text, reverts on error.

Empty state: "Sin notas. Tocá Editar para agregar." in muted text.

### `actions.ts`

```typescript
'use server'

// Fetch one week's training data (called by training-week.tsx during navigation)
export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number
): Promise<TrainingWeekData>

// Save or update coach note for a client (one note per coach+client pair)
export async function saveCoachNoteAction(
  clientId: string,
  content: string
): Promise<{ success: boolean; error?: string }>
```

`saveCoachNoteAction` implementation:
1. Get authenticated coach via `createClient().auth.getUser()`
2. Query `coach_notes` where `coach_id = coachId AND client_id = clientId` — take the first result
3. If found: `UPDATE coach_notes SET content = $1, updated_at = now() WHERE id = $2`
4. If not found: `INSERT INTO coach_notes (coach_id, client_id, content)`
5. Note: `coach_notes` allows multiple rows per pair in the DB schema — this logic enforces one-per-pair at the application level.

---

## Visual design highlights

- All section titles use the same style: `fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase'`
- Section spacing: `gap: 24` between sections, `padding: '0 20px 120px'` for bottom nav clearance
- Cards: `backgroundColor: '#111317', border: '1px solid #1F2227', borderRadius: 14`
- The day detail card has no fixed height — it grows with content (no truncation)
- The `in_progress` pill has a `keyframes` pulse ring: `box-shadow: 0 0 0 0 rgba(242,153,74,0.4)` → `0 0 0 6px transparent` looping

---

## Error / empty states

- Client not found → Next.js `notFound()` (404)
- Client belongs to different coach → `notFound()` (security: same response as not found)
- No active plan → plan-card shows "Sin plan asignado"
- No sessions ever → KPI shows "Sin sesiones", training week shows all days as upcoming/rest
- No coach notes → coach-notes shows empty state with invite to add

---

## What is NOT in scope

- Editing client fitness data (future: edit-client screen)
- Full session history list (future: sessions history screen)
- Assigning a plan (future: assign-plan flow)
- Body measurements chart (future: measurements screen)
- Push notifications / alerts
