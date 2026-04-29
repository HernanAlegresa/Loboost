# Weekly Load Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Weekly Load screen to show current-week KPI cards, a reactive muscle-group breakdown, and adherence tracking driven by bar selection in the chart.

**Architecture:** Server component (`page.tsx`) fetches enriched data in one pass (plan structure + completed sets + muscle groups via joins), passes it down to a client `WeeklyLoadChart` that owns `selectedWeek` state and drives two new sub-components (`MuscleGroupBreakdown`, `AdherenceBlock`). No client-side fetches.

**Tech Stack:** Next.js 15 App Router, Supabase server client, React inline styles, TypeScript strict.

---

### Task 1: Extend types + update getWeeklyLoadData

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/progress-queries.ts`

- [ ] **Step 1: Extend `WeeklyLoadPoint` type**

Replace lines 56–63 (the `WeeklyLoadPoint` type block):

```ts
export type WeeklyLoadPoint = {
  weekNumber: number
  weekLabel: string
  completedSets: number
  tonnageKg: number
  avgIntensityKg: number | null
  sessionCount: number
  plannedSets: number
  plannedSessions: number
}
```

- [ ] **Step 2: Add new types and MUSCLE_GROUPS_ORDER constant**

Immediately after the `WeeklyLoadPoint` type, insert:

```ts
export type MuscleWeekPoint = {
  weekNumber: number
  breakdown: Array<{ muscleGroup: string; completedSets: number }>
}

export type WeeklyLoadEnriched = {
  weeks: WeeklyLoadPoint[]
  muscleByWeek: MuscleWeekPoint[]
}

export const MUSCLE_GROUPS_ORDER = [
  'Piernas', 'Empuje', 'Espalda', 'Hombros', 'Core', 'Brazos', 'Cardio', 'Otro',
] as const
```

- [ ] **Step 3: Update getWeeklyLoadData to satisfy extended type**

`getWeeklyLoadData` still returns `WeeklyLoadPoint[]`; add `plannedSets: 0, plannedSessions: 0` to every object it creates.

Replace the `emptyWeeks` helper inside `getWeeklyLoadData`:

```ts
const emptyWeeks = (): WeeklyLoadPoint[] =>
  Array.from({ length: activePlan.currentWeek }, (_, i) => ({
    weekNumber: i + 1,
    weekLabel: `S${i + 1}`,
    completedSets: 0,
    tonnageKg: 0,
    avgIntensityKg: null,
    sessionCount: 0,
    plannedSets: 0,
    plannedSessions: 0,
  }))
```

Replace the final `Array.from` return at the bottom of `getWeeklyLoadData` (lines 389–404):

```ts
return Array.from({ length: activePlan.currentWeek }, (_, i) => {
  const w = i + 1
  const { start } = getWeekDateRange(activePlan.startDate, w)
  const agg = weekAgg.get(w)
  return {
    weekNumber: w,
    weekLabel: `S${w} · ${start.slice(5, 10).replace('-', '/')}`,
    completedSets: agg?.setCount ?? 0,
    tonnageKg: Math.round(agg?.totalWeightKg ?? 0),
    avgIntensityKg:
      agg && agg.weightedCount > 0
        ? Math.round((agg.totalWeightKg / agg.weightedCount) * 10) / 10
        : null,
    sessionCount: agg?.sessionIds.size ?? 0,
    plannedSets: 0,
    plannedSessions: 0,
  }
})
```

- [ ] **Step 4: Verify compilation**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/progress-queries.ts"
git commit -m "feat(weekly-load): extend WeeklyLoadPoint with plannedSets/plannedSessions, add enriched types"
```

---

### Task 2: Add getWeeklyLoadEnrichedData

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/progress-queries.ts`

- [ ] **Step 1: Add the function**

Insert the following function between `getWeeklyLoadData` and the `// ── Nav tile stats ──` comment:

```ts
export async function getWeeklyLoadEnrichedData(
  clientId: string,
  activePlan: ActivePlanSummary
): Promise<WeeklyLoadEnriched> {
  const supabase = await createClient()

  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number')
    .eq('client_plan_id', activePlan.id)

  const buildEmpty = (): WeeklyLoadEnriched => ({
    weeks: Array.from({ length: activePlan.weeks }, (_, i) => ({
      weekNumber: i + 1,
      weekLabel: `S${i + 1}`,
      completedSets: 0,
      tonnageKg: 0,
      avgIntensityKg: null,
      sessionCount: 0,
      plannedSets: 0,
      plannedSessions: 0,
    })),
    muscleByWeek: Array.from({ length: activePlan.weeks }, (_, i) => ({
      weekNumber: i + 1,
      breakdown: MUSCLE_GROUPS_ORDER.map((mg) => ({ muscleGroup: mg, completedSets: 0 })),
    })),
  })

  if (!planDays || planDays.length === 0) return buildEmpty()

  const planDayIds = planDays.map((d) => d.id)
  const weekByDayId = new Map(planDays.map((d) => [d.id, d.week_number]))

  // Planned sessions per week = number of plan days per week
  const plannedSessionsByWeek = new Map<number, number>()
  for (const pd of planDays) {
    plannedSessionsByWeek.set(pd.week_number, (plannedSessionsByWeek.get(pd.week_number) ?? 0) + 1)
  }

  // Plan day exercises: sets count + muscle group via join
  const { data: planDayExercises } = await supabase
    .from('client_plan_day_exercises')
    .select('id, client_plan_day_id, sets, exercises(muscle_group)')
    .in('client_plan_day_id', planDayIds)

  const plannedSetsByWeek = new Map<number, number>()
  const muscleGroupByPdeId = new Map<string, string>()

  for (const pde of planDayExercises ?? []) {
    const weekNumber = weekByDayId.get(pde.client_plan_day_id)
    if (weekNumber == null) continue
    const exRef = pde.exercises as { muscle_group: string } | null
    const rawMg = exRef?.muscle_group ?? ''
    const mg = (MUSCLE_GROUPS_ORDER as readonly string[]).includes(rawMg) ? rawMg : 'Otro'
    muscleGroupByPdeId.set(pde.id, mg)
    if (typeof pde.sets === 'number' && pde.sets > 0) {
      plannedSetsByWeek.set(weekNumber, (plannedSetsByWeek.get(weekNumber) ?? 0) + pde.sets)
    }
  }

  // Completed sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  if (!sessions || sessions.length === 0) {
    return {
      weeks: Array.from({ length: activePlan.weeks }, (_, i) => {
        const w = i + 1
        return {
          weekNumber: w,
          weekLabel: `S${w}`,
          completedSets: 0,
          tonnageKg: 0,
          avgIntensityKg: null,
          sessionCount: 0,
          plannedSets: plannedSetsByWeek.get(w) ?? 0,
          plannedSessions: plannedSessionsByWeek.get(w) ?? 0,
        }
      }),
      muscleByWeek: Array.from({ length: activePlan.weeks }, (_, i) => ({
        weekNumber: i + 1,
        breakdown: MUSCLE_GROUPS_ORDER.map((mg) => ({ muscleGroup: mg, completedSets: 0 })),
      })),
    }
  }

  const sessionIds = sessions.map((s) => s.id)
  const sessionWeekMap = new Map<string, number>()
  for (const s of sessions) {
    const week = weekByDayId.get(s.client_plan_day_id) ?? 0
    sessionWeekMap.set(s.id, week)
  }

  const { data: sessionSets } = await supabase
    .from('session_sets')
    .select('session_id, client_plan_day_exercise_id, weight_kg')
    .in('session_id', sessionIds)
    .eq('completed', true)

  type WeekAgg = {
    totalWeightKg: number
    setCount: number
    weightedCount: number
    sessionIds: Set<string>
    muscleSets: Map<string, number>
  }
  const weekAgg = new Map<number, WeekAgg>()

  for (const set of sessionSets ?? []) {
    const week = sessionWeekMap.get(set.session_id) ?? 0
    if (week === 0) continue
    if (!weekAgg.has(week)) {
      weekAgg.set(week, {
        totalWeightKg: 0,
        setCount: 0,
        weightedCount: 0,
        sessionIds: new Set(),
        muscleSets: new Map(),
      })
    }
    const agg = weekAgg.get(week)!
    agg.sessionIds.add(set.session_id)
    agg.setCount++
    if (set.weight_kg != null) {
      agg.totalWeightKg += Number(set.weight_kg)
      agg.weightedCount++
    }
    const mg = muscleGroupByPdeId.get(set.client_plan_day_exercise_id) ?? 'Otro'
    agg.muscleSets.set(mg, (agg.muscleSets.get(mg) ?? 0) + 1)
  }

  const weeks: WeeklyLoadPoint[] = Array.from({ length: activePlan.weeks }, (_, i) => {
    const w = i + 1
    const { start } = getWeekDateRange(activePlan.startDate, w)
    const agg = weekAgg.get(w)
    return {
      weekNumber: w,
      weekLabel: `S${w} · ${start.slice(5, 10).replace('-', '/')}`,
      completedSets: agg?.setCount ?? 0,
      tonnageKg: Math.round(agg?.totalWeightKg ?? 0),
      avgIntensityKg:
        agg && agg.weightedCount > 0
          ? Math.round((agg.totalWeightKg / agg.weightedCount) * 10) / 10
          : null,
      sessionCount: agg?.sessionIds.size ?? 0,
      plannedSets: plannedSetsByWeek.get(w) ?? 0,
      plannedSessions: plannedSessionsByWeek.get(w) ?? 0,
    }
  })

  const muscleByWeek: MuscleWeekPoint[] = Array.from({ length: activePlan.weeks }, (_, i) => {
    const w = i + 1
    const agg = weekAgg.get(w)
    return {
      weekNumber: w,
      breakdown: MUSCLE_GROUPS_ORDER.map((mg) => ({
        muscleGroup: mg,
        completedSets: agg?.muscleSets.get(mg) ?? 0,
      })),
    }
  })

  return { weeks, muscleByWeek }
}
```

- [ ] **Step 2: Verify compilation**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/progress-queries.ts"
git commit -m "feat(weekly-load): add getWeeklyLoadEnrichedData with muscle breakdown per week"
```

---

### Task 3: Wire new data — update page.tsx + chart props together

`page.tsx` and `weekly-load-chart.tsx` must be updated in the same commit because renaming the chart prop `data` → `weeks` breaks compilation in `page.tsx` until both files change.

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx`

- [ ] **Step 1: Update WeeklyLoadChart props interface in chart.tsx**

Update the import line at the top of `weekly-load-chart.tsx`:

```ts
import type { WeeklyLoadPoint, MuscleWeekPoint } from '../progress-queries'
```

Replace the main export function signature (lines 272–280):

```ts
export default function WeeklyLoadChart({
  weeks,
  muscleByWeek,
  currentWeek,
  planStartDate,
}: {
  weeks: WeeklyLoadPoint[]
  muscleByWeek: MuscleWeekPoint[]
  currentWeek: number
  planStartDate: string
}) {
```

Change `useState<number | null>(null)` to:

```ts
const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)
```

Change `handleSelectWeek` (remove toggle, always set):

```ts
function handleSelectWeek(weekNumber: number) {
  setSelectedWeek(weekNumber)
}
```

Replace all `data` references in the function body with `weeks`:

- `useMemo`: `data.map(...)` → `weeks.map(...)` and `[data, planStartDate]` → `[weeks, planStartDate]`
- `const totalSessions = data.reduce(...)` → `weeks.filter(w => w.weekNumber <= currentWeek).reduce(...)`
- `<BarChart data={data} ...>` → `<BarChart data={weeks} ...>`
- `{data.map((week, i) => (<WeekRow .../>))}` → `{weeks.map((week, i) => ...)}`

- [ ] **Step 2: Update BarChart for future weeks + visual spec**

Inside `BarChart`, add `isFuture` detection and update styles. The full updated `BarChart` return body for each `week` button:

```ts
const isFuture = week.weekNumber > currentWeek
```

Bar container `div` styles — replace the existing `background`/`outline` props:

```ts
background: isFuture
  ? '#1A1E24'
  : isSelected
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(255,255,255,0.06)',
outline: isCurrent
  ? '1.5px solid #B5F23D'
  : isSelected
    ? '1.5px solid rgba(255,255,255,0.2)'
    : 'none',
boxShadow: isCurrent ? '0 0 8px rgba(181,242,61,0.3)' : 'none',
```

Bar fill `div` — replace `background` and `height`:

```ts
height: isFuture ? '0%' : `${Math.max(pct, hasData ? 4 : 0)}%`,
background:
  hasData && !isFuture
    ? `linear-gradient(to bottom, ${barColor}, ${barColor}99)`
    : 'transparent',
```

Week label `span` — replace `color`:

```ts
color: isFuture
  ? '#374151'
  : isCurrent
    ? '#B5F23D'
    : isSelected
      ? '#9CA3AF'
      : '#6B7280',
```

Value label `span` — add `isFuture` guard so future weeks show nothing:

```ts
visibility: val !== null && !isFuture ? 'visible' : 'hidden',
```

`aria-label` — add future week hint:

```ts
aria-label={`Semana ${week.weekNumber}${isFuture ? ': semana futura' : `: ${val !== null ? `${val} ${METRIC_CONFIG[metric].unit}` : 'sin datos'}`}`}
```

- [ ] **Step 3: Update page.tsx imports and data fetch**

Replace line 3 import:

```ts
import { getClientBasicForCoach, getWeeklyLoadEnrichedData } from '../progress-queries'
import type { WeeklyLoadPoint } from '../progress-queries'
```

Inside `WeeklyLoadPage`, replace the data fetch (line 58 `const weeklyLoad = await getWeeklyLoadData(...)`) and the three `reduce` lines (totalTonnage/totalSessions/totalSets) with:

```ts
const enriched = await getWeeklyLoadEnrichedData(id, activePlan)
```

Replace the `<KpiStrip .../>` JSX call and remove the `KpiStrip` component entirely (lines 89 and 102–165). The `WeeklyHeroKpis` component will be added in Task 4.

Replace the `<WeeklyLoadChart .../>` JSX:

```tsx
<WeeklyLoadChart
  weeks={enriched.weeks}
  muscleByWeek={enriched.muscleByWeek}
  currentWeek={activePlan.currentWeek}
  planStartDate={activePlan.startDate}
/>
```

- [ ] **Step 4: Verify compilation**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx" "src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx"
git commit -m "feat(weekly-load): wire enriched data, rename chart props data→weeks, future week slots"
```

---

### Task 4: Add WeeklyHeroKpis to page.tsx

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx`

- [ ] **Step 1: Add WeeklyHeroKpis component**

Add this function to `page.tsx` after `ClientAvatarSlot` and before `WeeklyLoadPage`:

```tsx
function WeeklyHeroKpis({
  weeks,
  currentWeek,
}: {
  weeks: WeeklyLoadPoint[]
  currentWeek: number
}) {
  const curr = weeks.find((w) => w.weekNumber === currentWeek)
  const prev = weeks.find((w) => w.weekNumber === currentWeek - 1)

  function wowPct(
    current: number | null | undefined,
    previous: number | null | undefined
  ): number | null {
    if (current == null || previous == null || previous === 0) return null
    return Math.round(((current - previous) / previous) * 100)
  }

  const tonnagePct = wowPct(curr?.tonnageKg, prev?.tonnageKg)
  const intensityPct = wowPct(curr?.avgIntensityKg, prev?.avgIntensityKg)

  const tonnageStr =
    (curr?.tonnageKg ?? 0) >= 1000
      ? `${((curr?.tonnageKg ?? 0) / 1000).toFixed(1)} t`
      : `${curr?.tonnageKg ?? 0} kg`

  function Delta({ pct }: { pct: number | null }) {
    if (pct === null) return <span style={{ color: '#6B7280', fontSize: 11 }}>—</span>
    const up = pct >= 0
    return (
      <span style={{ color: up ? '#22C55E' : '#F87171', fontSize: 11, fontWeight: 600 }}>
        {up ? '↑' : '↓'} {Math.abs(pct)}%
      </span>
    )
  }

  const cards = [
    {
      label: 'Tonelaje',
      value: tonnageStr,
      sub: <Delta pct={tonnagePct} />,
    },
    {
      label: 'Volumen',
      value: `${curr?.completedSets ?? 0} series`,
      sub: curr?.plannedSets ? (
        <span style={{ color: '#6B7280', fontSize: 11 }}>
          {curr.completedSets} / {curr.plannedSets} plan.
        </span>
      ) : (
        <span style={{ color: '#6B7280', fontSize: 11 }}>sin plan</span>
      ),
    },
    {
      label: 'Intensidad',
      value: curr?.avgIntensityKg != null ? `${curr.avgIntensityKg} kg/s` : '—',
      sub: <Delta pct={intensityPct} />,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 1,
        margin: '12px 20px 0',
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            padding: '14px 8px',
            borderLeft: idx > 0 ? '1px solid #1F2227' : 'none',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              textAlign: 'center',
            }}
          >
            {card.label}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {card.value}
          </span>
          <div>{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Use WeeklyHeroKpis in WeeklyLoadPage**

In `WeeklyLoadPage`, after the plan info `<p>` tag and before `<WeeklyLoadChart .../>`, add:

```tsx
<WeeklyHeroKpis weeks={enriched.weeks} currentWeek={activePlan.currentWeek} />
```

- [ ] **Step 3: Verify compilation**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx"
git commit -m "feat(weekly-load): add WeeklyHeroKpis with current-week metrics and WoW deltas"
```

---

### Task 5: Add MuscleGroupBreakdown + AdherenceBlock to chart

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx`

- [ ] **Step 1: Add MUSCLE_GROUPS_ORDER import**

Update the import line at the top of `weekly-load-chart.tsx`:

```ts
import type { WeeklyLoadPoint, MuscleWeekPoint } from '../progress-queries'
import { MUSCLE_GROUPS_ORDER } from '../progress-queries'
```

- [ ] **Step 2: Add MuscleGroupBreakdown component**

Add this before the `// ── Main export` comment:

```tsx
function MuscleGroupBreakdown({
  breakdown,
  weekNumber,
}: {
  breakdown: Array<{ muscleGroup: string; completedSets: number }>
  weekNumber: number
}) {
  const hasAny = breakdown.some((b) => b.completedSets > 0)
  const maxSets = Math.max(...breakdown.map((b) => b.completedSets), 1)

  const ordered = MUSCLE_GROUPS_ORDER.map(
    (mg) => breakdown.find((b) => b.muscleGroup === mg) ?? { muscleGroup: mg, completedSets: 0 }
  )

  if (!hasAny) {
    return (
      <div style={{ padding: '16px 20px 4px' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0, textAlign: 'center' }}>
          Sin sesiones en semana {weekNumber}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          margin: '0 0 10px',
        }}
      >
        Grupos musculares
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordered.map(({ muscleGroup, completedSets }) => {
          const pct = (completedSets / maxSets) * 100
          const hasData = completedSets > 0
          return (
            <div key={muscleGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: hasData ? '#9CA3AF' : '#4B5563',
                  width: 60,
                  flexShrink: 0,
                }}
              >
                {muscleGroup}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: '#1F2227',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: hasData ? '#B5F23D66' : 'transparent',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: hasData ? '#F0F0F0' : '#4B5563',
                  width: 32,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {hasData ? completedSets : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add AdherenceBlock component**

Add this after `MuscleGroupBreakdown`, before `// ── Main export`:

```tsx
function AdherenceBlock({
  week,
  weekNumber,
}: {
  week: WeeklyLoadPoint
  weekNumber: number
}) {
  if (week.plannedSessions === 0) return null

  const sessionPct =
    week.plannedSets > 0 ? Math.round((week.completedSets / week.plannedSets) * 100) : null

  let label = ''
  let labelColor = '#6B7280'
  if (sessionPct !== null) {
    if (sessionPct >= 90) {
      label = 'Carga dentro del rango'
      labelColor = '#22C55E'
    } else if (sessionPct >= 70) {
      label = 'Carga moderada'
      labelColor = '#F59E0B'
    } else {
      label = 'Carga baja — revisar'
      labelColor = '#F87171'
    }
  }

  const sessionDots = Array.from(
    { length: week.plannedSessions },
    (_, i) => i < week.sessionCount
  )

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          margin: '0 0 10px',
        }}
      >
        Adherencia — Semana {weekNumber}
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {sessionDots.map((done, i) => (
          <span key={i} style={{ fontSize: 16, color: done ? '#B5F23D' : '#374151', lineHeight: 1 }}>
            {done ? '●' : '○'}
          </span>
        ))}
        <span style={{ fontSize: 11, color: '#6B7280', alignSelf: 'center', marginLeft: 4 }}>
          {week.sessionCount}/{week.plannedSessions} sesiones
        </span>
      </div>

      {week.plannedSets > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Series</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {week.completedSets}/{week.plannedSets}
            </span>
          </div>
          <div
            style={{ height: 6, borderRadius: 3, background: '#1F2227', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${Math.min((week.completedSets / week.plannedSets) * 100, 100)}%`,
                height: '100%',
                background: '#B5F23D66',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {label && (
        <p style={{ fontSize: 12, fontWeight: 600, color: labelColor, margin: 0 }}>
          {label}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire sub-components in WeeklyLoadChart body**

In the main `WeeklyLoadChart` function, after the `useMemo` for `dateRanges`, add:

```ts
const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek)
const selectedMuscleData = muscleByWeek.find((m) => m.weekNumber === selectedWeek)
```

In the JSX, after the chart section (after the `</div>` that closes `{/* Chart */}`) and before `{/* Week detail list */}`, insert:

```tsx
{/* Muscle group breakdown — reactive to selectedWeek */}
{selectedMuscleData && (
  <MuscleGroupBreakdown
    breakdown={selectedMuscleData.breakdown}
    weekNumber={selectedWeek}
  />
)}

{/* Adherence — reactive to selectedWeek */}
{selectedWeekData && (
  <AdherenceBlock week={selectedWeekData} weekNumber={selectedWeek} />
)}
```

- [ ] **Step 5: Final compilation check**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx"
git commit -m "feat(weekly-load): add MuscleGroupBreakdown and AdherenceBlock reactive to selected week"
```
