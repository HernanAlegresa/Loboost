# Coach Client Profile UX/UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar a nivel producción el perfil de cliente (lado coach) con sistema de estados operativos correcto, pantallas de detalle mejoradas y consistencia visual total.

**Architecture:** TypeScript utility `computeClientStatus` calcula el estado real del cliente (al-dia/atencion/riesgo/sin-datos) basado en series completadas vs planificadas por día. El resultado reemplaza el `statusColor` actual en toda la app. Cada pantalla de detalle recibe mejoras UX independientes que no requieren nuevas queries salvo donde se indica.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (supabase-js), inline styles, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-24-coach-client-profile-ux-redesign.md`

---

## File Map

| Acción | Archivo |
|--------|---------|
| **CREATE** | `src/features/clients/types/client-status.ts` |
| **CREATE** | `src/features/clients/utils/compute-client-status.ts` |
| **MODIFY** | `src/features/clients/types.ts` — reemplazar `statusColor` por `status: ClientStatus` |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/queries.ts` — llamar a `computeClientStatus` |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/progress-queries.ts` — agregar `getNavTileStats` |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/page.tsx` — paralelizar queries + pasar nuevos props |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx` — usar `ClientStatus` |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/client-progress-content.tsx` — StatusBanner + NavTiles + tendencia |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/check-ins/page.tsx` — summary strip |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx` — renderizar trend |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx` — KPI strip prominente |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx` — aria-labels en barras |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/client-sessions-list.tsx` — summary + agrupación semanal + estados vacíos |
| **MODIFY** | `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx` — completion badge + dots semánticos |
| **MODIFY** | `src/app/(coach)/coach/dashboard/queries.ts` — usar `computeClientStatus` en listado |
| **MODIFY** | `src/app/(coach)/coach/clients/client-card.tsx` — usar `ClientStatus` |

---

## Task 1: Tipo ClientStatus

**Files:**
- Create: `src/features/clients/types/client-status.ts`

- [ ] **Crear el archivo con el tipo y la config**

```typescript
// src/features/clients/types/client-status.ts

export type ClientStatus = 'al-dia' | 'atencion' | 'riesgo' | 'sin-datos'

export const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string }
> = {
  'al-dia':    { label: 'Al día',    color: '#B5F23D', bg: 'rgba(181,242,61,0.12)'  },
  'atencion':  { label: 'Atención',  color: '#F2C94A', bg: 'rgba(242,201,74,0.12)'  },
  'riesgo':    { label: 'Riesgo',    color: '#F25252', bg: 'rgba(242,82,82,0.12)'   },
  'sin-datos': { label: 'Sin datos', color: '#4B5563', bg: 'rgba(75,85,99,0.12)'    },
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Commit**

```bash
git add src/features/clients/types/client-status.ts
git commit -m "feat(status): add ClientStatus type and config"
```

---

## Task 2: Utility computeClientStatus

**Files:**
- Create: `src/features/clients/utils/compute-client-status.ts`

**Lógica:** Para cada día de entrenamiento del plan anterior a hoy (excluyendo hoy), verifica si existe sesión con todas las series planificadas completadas. Clasifica por semana actual vs semanas anteriores.

- [ ] **Crear el archivo**

```typescript
// src/features/clients/utils/compute-client-status.ts

import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { ActivePlanSummary } from '@/features/clients/types'
import type { ClientStatus } from '@/features/clients/types/client-status'

export async function computeClientStatus(
  clientId: string,
  activePlan: ActivePlanSummary | null
): Promise<ClientStatus> {
  if (!activePlan) return 'sin-datos'

  const supabase = await createClient()
  const todayISO = new Date().toISOString().split('T')[0]

  // 1. Todos los días del plan (hasta la semana actual inclusive)
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week')
    .eq('client_plan_id', activePlan.id)
    .lte('week_number', activePlan.currentWeek)

  if (!planDays || planDays.length === 0) return 'sin-datos'

  // 2. Filtrar solo días pasados (fecha < hoy, excluye hoy)
  const pastDays = planDays
    .map((d) => ({
      ...d,
      dateISO: computeDayDate(activePlan.startDate, d.week_number, d.day_of_week),
    }))
    .filter((d) => d.dateISO < todayISO)

  if (pastDays.length === 0) return 'sin-datos'

  const pastDayIds = pastDays.map((d) => d.id)

  // 3. Series planificadas por día (SUM de client_plan_day_exercises.sets por day)
  const { data: planExercises } = await supabase
    .from('client_plan_day_exercises')
    .select('client_plan_day_id, sets')
    .in('client_plan_day_id', pastDayIds)

  const plannedSetsByDayId = new Map<string, number>()
  for (const ex of planExercises ?? []) {
    plannedSetsByDayId.set(
      ex.client_plan_day_id,
      (plannedSetsByDayId.get(ex.client_plan_day_id) ?? 0) + ex.sets
    )
  }

  // 4. Sesiones del cliente para esos días
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id')
    .eq('client_id', clientId)
    .in('client_plan_day_id', pastDayIds)

  const sessionByDayId = new Map(
    (sessions ?? []).map((s) => [s.client_plan_day_id, s])
  )

  const sessionIds = (sessions ?? []).map((s) => s.id)

  // 5. Series completadas por sesión
  const completedSetsBySessionId = new Map<string, number>()
  if (sessionIds.length > 0) {
    const { data: completedSets } = await supabase
      .from('session_sets')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('completed', true)

    for (const s of completedSets ?? []) {
      completedSetsBySessionId.set(
        s.session_id,
        (completedSetsBySessionId.get(s.session_id) ?? 0) + 1
      )
    }
  }

  // 6. Sin ninguna serie completada en total → sin-datos
  const totalCompleted = Array.from(completedSetsBySessionId.values()).reduce(
    (a, b) => a + b,
    0
  )
  if (totalCompleted === 0) return 'sin-datos'

  // 7. Clasificar días incompletos
  let hasRiskyDay = false
  let hasAttentionDay = false

  for (const day of pastDays) {
    const session = sessionByDayId.get(day.id)
    const planned = plannedSetsByDayId.get(day.id) ?? 0
    const completed = session
      ? (completedSetsBySessionId.get(session.id) ?? 0)
      : 0
    const isDayComplete = planned > 0 && completed >= planned

    if (!isDayComplete) {
      if (day.week_number < activePlan.currentWeek) {
        hasRiskyDay = true
      } else {
        hasAttentionDay = true
      }
    }
  }

  if (hasRiskyDay) return 'riesgo'
  if (hasAttentionDay) return 'atencion'
  return 'al-dia'
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Commit**

```bash
git add src/features/clients/utils/compute-client-status.ts
git commit -m "feat(status): add computeClientStatus utility"
```

---

## Task 3: Integrar status en ClientProfileData + queries.ts

**Files:**
- Modify: `src/features/clients/types.ts`
- Modify: `src/app/(coach)/coach/clients/[id]/queries.ts`

- [ ] **Actualizar ClientProfileData en types.ts**

En `src/features/clients/types.ts`, cambiar la línea:
```typescript
// ANTES (línea 67):
statusColor: 'active' | 'warning' | 'critical'

// DESPUÉS:
status: import('@/features/clients/types/client-status').ClientStatus
```

Como TypeScript no permite inline imports en tipos, agregar el import al inicio del archivo:

```typescript
// Agregar al inicio de src/features/clients/types.ts (antes de los exports existentes):
import type { ClientStatus } from '@/features/clients/types/client-status'
```

Y cambiar la línea en `ClientProfileData`:
```typescript
status: ClientStatus
```

También eliminar el campo `statusColor` de `ClientProfileData` (reemplazado por `status`).

- [ ] **Actualizar queries.ts: llamar computeClientStatus y eliminar lógica antigua**

En `src/app/(coach)/coach/clients/[id]/queries.ts`:

Agregar imports al inicio:
```typescript
import { computeClientStatus } from '@/features/clients/utils/compute-client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'
```

En `getClientProfileData`, eliminar el bloque de `statusColor` (líneas ~132-140):
```typescript
// ELIMINAR todo esto:
const hasActivePlan = plan !== null
let statusColor: 'active' | 'warning' | 'critical'
if (!hasActivePlan || (daysSinceLastSession !== null && daysSinceLastSession > 7)) {
  statusColor = 'critical'
} else if (daysSinceLastSession !== null && daysSinceLastSession > 3) {
  statusColor = 'warning'
} else {
  statusColor = 'active'
}
```

Y en el `return` final, reemplazar `statusColor` por `status`:
```typescript
// El return necesita llamar a computeClientStatus. Como getClientProfileData es async,
// agregar la llamada justo antes del return (después de que activePlan está construido):

const status: ClientStatus = await computeClientStatus(clientId, activePlan)

return {
  id: clientId,
  fullName: profileResult.data.full_name ?? 'Sin nombre',
  goal: cp?.goal ?? null,
  status,           // <-- reemplaza statusColor
  weeklyCompliance,
  daysSinceLastSession,
  totalSessions,
  // ... resto igual
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: errores en `client-profile-hero-card.tsx` (usa `statusColor`) — se arreglan en Task 4.

- [ ] **Commit**

```bash
git add src/features/clients/types.ts src/app/(coach)/coach/clients/[id]/queries.ts
git commit -m "feat(status): replace statusColor with ClientStatus in profile data"
```

---

## Task 4: Actualizar ClientProfileHeroCard

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx`

- [ ] **Reemplazar prop statusColor por status**

```typescript
// src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx
// Agregar import al inicio:
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'
```

Cambiar la definición del tipo Props:
```typescript
// ANTES:
type Props = {
  statusColor: 'active' | 'warning' | 'critical'
  // ...
}

// DESPUÉS:
type Props = {
  status: ClientStatus
  // ...
}
```

Cambiar el cálculo de `ringColor` dentro del componente:
```typescript
// ANTES:
const ringColor =
  statusColor === 'active' ? '#22C55E' : statusColor === 'warning' ? '#F2994A' : '#F25252'

// DESPUÉS:
const ringColor = CLIENT_STATUS_CONFIG[status].color
```

- [ ] **Actualizar page.tsx para pasar el nuevo prop**

En `src/app/(coach)/coach/clients/[id]/page.tsx`, cambiar:
```typescript
// ANTES:
statusColor={profile.statusColor}

// DESPUÉS:
status={profile.status}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/client-profile-hero-card.tsx src/app/(coach)/coach/clients/[id]/page.tsx
git commit -m "feat(status): update hero card to use ClientStatus for ring color"
```

---

## Task 5: getNavTileStats + parallelizar queries en page.tsx

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/progress-queries.ts`
- Modify: `src/app/(coach)/coach/clients/[id]/page.tsx`

- [ ] **Agregar tipo NavTileStats y función getNavTileStats en progress-queries.ts**

Agregar al final del archivo `progress-queries.ts`:

```typescript
// ── Nav tile stats ────────────────────────────────────────────────────────────

export type NavTileStats = {
  exercisesWithProgress: number
  totalTonnageKg: number
}

export async function getNavTileStats(
  clientId: string,
  activePlan: ActivePlanSummary | null
): Promise<NavTileStats> {
  if (!activePlan) return { exercisesWithProgress: 0, totalTonnageKg: 0 }

  const supabase = await createClient()

  const { data: planDayRows } = await supabase
    .from('client_plan_days')
    .select('id')
    .eq('client_plan_id', activePlan.id)

  const planDayIds = (planDayRows ?? []).map((d) => d.id)
  if (!planDayIds.length) return { exercisesWithProgress: 0, totalTonnageKg: 0 }

  const { data: sessionRows } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  const sessionIds = (sessionRows ?? []).map((s) => s.id)
  if (!sessionIds.length) return { exercisesWithProgress: 0, totalTonnageKg: 0 }

  const [pdeRows, weightRows] = await Promise.all([
    supabase
      .from('session_sets')
      .select('client_plan_day_exercise_id')
      .in('session_id', sessionIds)
      .eq('completed', true),
    supabase
      .from('session_sets')
      .select('weight_kg')
      .in('session_id', sessionIds)
      .eq('completed', true)
      .not('weight_kg', 'is', null),
  ])

  const uniquePdeIds = [
    ...new Set((pdeRows.data ?? []).map((s) => s.client_plan_day_exercise_id)),
  ]

  let exercisesWithProgress = 0
  if (uniquePdeIds.length) {
    const { data: exRows } = await supabase
      .from('client_plan_day_exercises')
      .select('exercise_id')
      .in('id', uniquePdeIds)
    exercisesWithProgress = new Set((exRows ?? []).map((e) => e.exercise_id)).size
  }

  const totalTonnageKg = Math.round(
    (weightRows.data ?? []).reduce((sum, s) => sum + Number(s.weight_kg ?? 0), 0)
  )

  return { exercisesWithProgress, totalTonnageKg }
}
```

- [ ] **Actualizar page.tsx: paralelizar y pasar navTileStats**

```typescript
// src/app/(coach)/coach/clients/[id]/page.tsx
// Agregar import:
import { getProgressKPIs, getNavTileStats } from './progress-queries'
import type { NavTileStats } from './progress-queries'

// Reemplazar las llamadas secuales por paralelas:
// ANTES:
const kpis = await getProgressKPIs(id, profile.weightKg, profile.activePlan)
const sessions = await getClientSessionsForCoach(id, user.id)

// DESPUÉS:
const [kpis, sessions, navTileStats] = await Promise.all([
  getProgressKPIs(id, profile.weightKg, profile.activePlan),
  getClientSessionsForCoach(id, user.id),
  getNavTileStats(id, profile.activePlan),
])
if (sessions === null) notFound()
```

Y pasar `navTileStats` a `ClientProgressContent` en el JSX:
```tsx
// ANTES:
<ClientProgressContent
  clientId={profile.id}
  progressKPIs={kpis}
  activePlan={profile.activePlan}
  totalSessions={profile.totalSessions}
  progressSeries={profile.progressSeries}
/>

// DESPUÉS:
<ClientProgressContent
  clientId={profile.id}
  progressKPIs={kpis}
  activePlan={profile.activePlan}
  totalSessions={profile.totalSessions}
  progressSeries={profile.progressSeries}
  navTileStats={navTileStats}
  clientStatus={profile.status}
/>
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: errores en `ClientProgressContent` (prop no existe aún) — se arreglan en Task 6.

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/progress-queries.ts src/app/(coach)/coach/clients/[id]/page.tsx
git commit -m "feat(progress): add getNavTileStats and parallelize page queries"
```

---

## Task 6: ClientProgressContent — StatusBanner + NavTiles + tendencia

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-progress-content.tsx`

- [ ] **Reescribir client-progress-content.tsx**

```typescript
// src/app/(coach)/coach/clients/[id]/client-progress-content.tsx
import Link from 'next/link'
import {
  ChevronRight,
  ClipboardList,
  Dumbbell,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  MinusCircle,
} from 'lucide-react'
import type { ProgressKPIs } from './progress-queries'
import type { NavTileStats } from './progress-queries'
import type { ActivePlanSummary } from '@/features/clients/types'
import type { ClientStatus } from '@/features/clients/types/client-status'
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import ProgressOverview from './progress-overview'

type Props = {
  clientId: string
  progressKPIs: ProgressKPIs
  activePlan: ActivePlanSummary | null
  totalSessions: number
  progressSeries: Array<{ label: string; completed: number }>
  navTileStats: NavTileStats
  clientStatus: ClientStatus
}

const SECTION_OVERLINE: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 10,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const STATUS_MESSAGES: Record<ClientStatus, string> = {
  'al-dia':    'Todos los entrenamientos registrados al día.',
  'atencion':  'Tiene días sin completar esta semana.',
  'riesgo':    'Semanas anteriores con registros faltando.',
  'sin-datos': 'Sin registros en ningún entrenamiento.',
}

const STATUS_ICONS: Record<ClientStatus, React.ReactNode> = {
  'al-dia':    <CheckCircle2 size={16} strokeWidth={2.5} />,
  'atencion':  <AlertTriangle size={16} strokeWidth={2.5} />,
  'riesgo':    <AlertOctagon size={16} strokeWidth={2.5} />,
  'sin-datos': <MinusCircle size={16} strokeWidth={2.5} />,
}

function StatusBanner({ status }: { status: ClientStatus }) {
  const cfg = CLIENT_STATUS_CONFIG[status]
  return (
    <div
      style={{
        backgroundColor: cfg.bg,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0, display: 'flex' }}>
        {STATUS_ICONS[status]}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
          {cfg.label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
          {STATUS_MESSAGES[status]}
        </p>
      </div>
    </div>
  )
}

function KpiItem({
  label,
  value,
  sub,
  valueColor = '#F0F0F0',
  subColor = '#9CA3AF',
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  subColor?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '18px 8px',
      }}
    >
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: 0,
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
          margin: 0,
        }}
      >
        {value}
      </p>
      {sub ? (
        <p style={{ fontSize: 11, fontWeight: 600, color: subColor, textAlign: 'center', margin: 0 }}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

function KpiDivider() {
  return (
    <div
      style={{ width: 1, height: 44, background: '#252A31', flexShrink: 0, alignSelf: 'center' }}
    />
  )
}

function NavTile({
  href,
  iconBg,
  icon,
  title,
  subtitle,
  preview,
}: {
  href: string
  iconBg: string
  icon: React.ReactNode
  title: string
  subtitle: string
  preview?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        </div>
        {preview ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#9CA3AF',
              flexShrink: 0,
              marginRight: 4,
            }}
          >
            {preview}
          </span>
        ) : null}
        <ChevronRight size={18} color="#6B7280" strokeWidth={2.5} style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}

function computeTrend(
  points: Array<{ completed: number }>
): { arrow: string; label: string; color: string } {
  if (points.length < 4) return { arrow: '→', label: 'Estable', color: '#6B7280' }
  const recent = points.slice(-2).reduce((s, p) => s + p.completed, 0)
  const prior = points.slice(-4, -2).reduce((s, p) => s + p.completed, 0)
  if (recent > prior) return { arrow: '↑', label: 'Subiendo', color: '#B5F23D' }
  if (recent < prior) return { arrow: '↓', label: 'Bajando', color: '#F2C94A' }
  return { arrow: '→', label: 'Estable', color: '#6B7280' }
}

export default function ClientProgressContent({
  clientId,
  progressKPIs,
  activePlan,
  totalSessions,
  progressSeries,
  navTileStats,
  clientStatus,
}: Props) {
  const { weightInitialKg, weightCurrentKg, weightDeltaKg, checkInsSubmitted, checkInsExpected } =
    progressKPIs

  const deltaStr =
    weightDeltaKg !== null ? `${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg` : null
  const deltaColor =
    weightDeltaKg == null
      ? '#9CA3AF'
      : weightDeltaKg > 0
        ? '#F2994A'
        : weightDeltaKg < 0
          ? '#B5F23D'
          : '#9CA3AF'

  const trend = computeTrend(progressSeries)

  const tonnageStr =
    navTileStats.totalTonnageKg > 0
      ? navTileStats.totalTonnageKg >= 1000
        ? `${(navTileStats.totalTonnageKg / 1000).toFixed(1)} t`
        : `${navTileStats.totalTonnageKg} kg`
      : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Estado operativo */}
      <StatusBanner status={clientStatus} />

      {/* Resumen KPIs */}
      <div>
        <p style={SECTION_OVERLINE}>Resumen</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <KpiItem
              label="Peso inicial"
              value={weightInitialKg !== null ? `${weightInitialKg} kg` : '—'}
            />
            <KpiDivider />
            <KpiItem
              label="Peso actual"
              value={weightCurrentKg !== null ? `${weightCurrentKg} kg` : '—'}
              valueColor="#B5F23D"
              sub={deltaStr ?? undefined}
              subColor={deltaColor}
            />
            <KpiDivider />
            <KpiItem label="Check-ins" value={`${checkInsSubmitted}/${checkInsExpected}`} />
          </div>
          <p
            style={{
              margin: 0,
              padding: '10px 16px 14px',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#6B7280',
              borderTop: '1px solid #1F2227',
            }}
          >
            {totalSessions}{' '}
            {totalSessions === 1 ? 'sesión completada en total' : 'sesiones completadas en total'}
          </p>
        </div>
      </div>

      {/* Actividad */}
      <div>
        <p style={SECTION_OVERLINE}>Actividad</p>
        <ProgressOverview points={progressSeries} />
        {progressSeries.length >= 4 && (
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trend.color,
              textAlign: 'right',
              margin: '6px 0 0',
            }}
          >
            {trend.arrow} {trend.label}
          </p>
        )}
      </div>

      {/* Seguimiento */}
      <div>
        <p style={SECTION_OVERLINE}>Seguimiento</p>
        {activePlan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <NavTile
              href={`/coach/clients/${clientId}/check-ins`}
              iconBg="rgba(181,242,61,0.12)"
              icon={<ClipboardList size={20} color="#B5F23D" />}
              title="Check-ins semanales"
              subtitle="Peso registrado semana a semana"
              preview={
                checkInsExpected > 0
                  ? `${checkInsSubmitted}/${checkInsExpected}`
                  : undefined
              }
            />
            <NavTile
              href={`/coach/clients/${clientId}/exercises-progress`}
              iconBg="rgba(99,179,237,0.12)"
              icon={<Dumbbell size={20} color="#63B3ED" />}
              title="Progreso de ejercicios"
              subtitle="Evolución de carga por ejercicio"
              preview={
                navTileStats.exercisesWithProgress > 0
                  ? `${navTileStats.exercisesWithProgress} ejerc.`
                  : undefined
              }
            />
            <NavTile
              href={`/coach/clients/${clientId}/weekly-load`}
              iconBg="rgba(246,173,85,0.12)"
              icon={<BarChart2 size={20} color="#F6AD55" />}
              title="Carga semanal"
              subtitle="Volumen, intensidad y tonelaje"
              preview={tonnageStr}
            />
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
              Asigná un plan activo para abrir check-ins, progreso por ejercicio y carga semanal.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/client-progress-content.tsx
git commit -m "feat(progress): add StatusBanner, NavTile previews, and trend indicator"
```

---

## Task 7: Check-ins — summary strip

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/check-ins/page.tsx`

- [ ] **Agregar función computeSummary y componente SummaryStrip**

Agregar estas funciones/componentes después de los imports existentes en `check-ins/page.tsx`:

```typescript
// Después de los imports, antes de `export default async function CheckInsPage`:

function computeCheckInSummary(
  weeks: import('../progress-queries').CheckInWeek[],
  currentWeek: number
): { registered: number; pending: number; missed: number } {
  let registered = 0
  let pending = 0
  let missed = 0
  for (const week of weeks) {
    if (week.isFuture) continue
    if (week.entry !== null) {
      registered++
    } else if (week.weekNumber === currentWeek) {
      pending++
    } else {
      missed++
    }
  }
  return { registered, pending, missed }
}

function SummaryPill({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '10px 8px',
        backgroundColor: `${color}14`,
        borderRadius: 10,
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </div>
  )
}
```

Luego, dentro de `CheckInsPage`, después de `const summary = await getCheckInsSummary(...)`, agregar:

```typescript
const checkInCounts = computeCheckInSummary(summary.weeks, summary.currentWeek)
```

Y en el JSX, insertar el strip entre el plan name y el week list:

```tsx
{/* Summary strip — entre el plan name y la lista */}
<div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
  <SummaryPill value={checkInCounts.registered} label="Registradas" color="#B5F23D" />
  <SummaryPill value={checkInCounts.pending}    label="Pendiente"   color="#F2C94A" />
  <SummaryPill value={checkInCounts.missed}     label="Sin registrar" color="#F25252" />
</div>
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/check-ins/page.tsx
git commit -m "feat(check-ins): add summary strip with registered/pending/missed counts"
```

---

## Task 8: Progreso de ejercicios — indicador de tendencia

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx`

**Nota:** `ExerciseProgressData` ya tiene `trend: 'up' | 'down' | 'stable' | 'none'` y `lastTopSetKg` — el backend ya los computa. Solo hay que renderizarlos.

- [ ] **Actualizar ExerciseCard para mostrar tendencia**

Reemplazar la función `ExerciseCard` completa:

```typescript
function ExerciseCard({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const bw = ex.peakTopSetKg === null

  const trendConfig = {
    up:     { arrow: '↑', color: '#B5F23D' },
    down:   { arrow: '↓', color: '#F25252' },
    stable: { arrow: '→', color: '#6B7280' },
    none:   null,
  }[ex.trend]

  return (
    <Link
      href={`/coach/clients/${clientId}/exercises-progress/${ex.exerciseId}`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg,#12161C 0%,#0F1217 100%)',
          border: '1px solid #252A31',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: '#B5F23D',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ex.exerciseName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {!bw && ex.lastTopSetKg !== null ? (
            <p style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1 }}>
              {ex.lastTopSetKg} kg
            </p>
          ) : null}
          {trendConfig && (
            <span
              style={{ fontSize: 12, fontWeight: 700, color: trendConfig.color, lineHeight: 1 }}
            >
              {trendConfig.arrow}
            </span>
          )}
        </div>
        <ChevronRight size={20} color="#B5F23D" strokeWidth={2.5} />
      </div>
    </Link>
  )
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/exercises-progress/exercises-progress-list.tsx
git commit -m "feat(exercises): render trend indicator and lastTopSetKg in exercise cards"
```

---

## Task 9: Carga semanal — KPI strip prominente + aria-labels

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx`

- [ ] **Reemplazar TotalPills por KPI strip prominente en weekly-load/page.tsx**

Reemplazar la función `TotalPill` y el bloque "Totals strip" completo:

```typescript
// Reemplazar la función TotalPill al final del archivo:
function KpiStrip({
  tonnage,
  sessions,
  sets,
}: {
  tonnage: number
  sessions: number
  sets: number
}) {
  const tonnageStr = tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)} t` : `${tonnage} kg`

  const items = [
    { value: tonnageStr, label: 'Tonelaje' },
    { value: sessions.toString(), label: 'Sesiones' },
    { value: sets.toString(), label: 'Series' },
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
      {items.map((item, idx) => (
        <div
          key={item.label}
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
            style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', lineHeight: 1 }}
          >
            {item.value}
          </span>
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
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
```

En el JSX del componente, reemplazar el bloque "Totals strip":
```tsx
{/* ANTES: <div style={{ display: 'flex', gap: 10, padding: '12px 20px 0' }}> ... </div> */}

{/* DESPUÉS: */}
<KpiStrip
  tonnage={totalTonnage}
  sessions={totalSessions}
  sets={totalSets}
/>
```

- [ ] **Agregar aria-labels a barras en weekly-load-chart.tsx**

En `BarChart`, dentro del `map` de barras, agregar `aria-label` al botón:

```tsx
// Dentro del return del map de data.map((week) => { ... }):
<button
  key={week.weekNumber}
  onClick={() => onSelectWeek(week.weekNumber)}
  aria-label={`Semana ${week.weekNumber}: ${val !== null ? `${val} ${METRIC_CONFIG[metric].unit}` : 'sin datos'}`}
  style={{
    // ... estilos existentes sin cambios
  }}
>
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/weekly-load/page.tsx src/app/(coach)/coach/clients/[id]/weekly-load/weekly-load-chart.tsx
git commit -m "feat(weekly-load): replace TotalPills with prominent KPI strip and add aria-labels"
```

---

## Task 10: ClientSessionsList — summary + agrupación semanal + estados vacíos

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/client-sessions-list.tsx`
- Modify: `src/app/(coach)/coach/clients/[id]/page.tsx` (pasar hasPlan)

- [ ] **Reescribir client-sessions-list.tsx**

```typescript
// src/app/(coach)/coach/clients/[id]/client-sessions-list.tsx
import Link from 'next/link'
import type { ClientSessionListItem } from './sessions/queries'

const T = {
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatDaysAgo(sessions: ClientSessionListItem[]): string | null {
  if (sessions.length === 0) return null
  // Ordenar por fecha descendente para encontrar la más reciente
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]
  const diffMs = Date.now() - new Date(latest.date + 'T00:00:00').getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

function SessionRow({ session, clientId }: { session: ClientSessionListItem; clientId: string }) {
  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/coach/clients/${clientId}/sessions/${session.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
            {DAY_NAMES[session.dayOfWeek]} · {date}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
            {session.exerciseCount} ejerc · {session.completedSets} series
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {session.rpe != null ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.lime }}>
              RPE {session.rpe}
            </p>
          ) : null}
        </div>
      </div>
      {session.notes ? (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 12,
            color: T.secondary,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          &ldquo;{session.notes}&rdquo;
        </p>
      ) : null}
    </Link>
  )
}

function WeekOverline({ weekNumber }: { weekNumber: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        marginTop: 16,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#4B5563',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        Semana {weekNumber}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#1F2227' }} />
    </div>
  )
}

export default function ClientSessionsList({
  sessions,
  clientId,
  hasPlan = true,
}: {
  sessions: ClientSessionListItem[]
  clientId: string
  hasPlan?: boolean
}) {
  if (!hasPlan) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Asigná un plan activo para que el cliente pueda registrar entrenamientos.
      </p>
    )
  }

  if (sessions.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Todavía no hay entrenamientos registrados en este plan.
      </p>
    )
  }

  // Agrupar por semana
  const byWeek = new Map<number, ClientSessionListItem[]>()
  for (const session of sessions) {
    if (!byWeek.has(session.weekNumber)) byWeek.set(session.weekNumber, [])
    byWeek.get(session.weekNumber)!.push(session)
  }
  const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => b - a)

  const daysAgo = formatDaysAgo(sessions)

  return (
    <div>
      {/* Summary strip */}
      <p
        style={{
          fontSize: 12,
          color: T.muted,
          margin: '0 0 4px',
          lineHeight: 1.5,
        }}
      >
        {sessions.length} {sessions.length === 1 ? 'sesión completada' : 'sesiones completadas'}
        {daysAgo ? ` · Última ${daysAgo}` : ''}
      </p>

      {/* Grouped list */}
      {sortedWeeks.map((weekNumber) => (
        <div key={weekNumber}>
          <WeekOverline weekNumber={weekNumber} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byWeek.get(weekNumber)!.map((session) => (
              <SessionRow key={session.id} session={session} clientId={clientId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Actualizar page.tsx para pasar hasPlan**

En `src/app/(coach)/coach/clients/[id]/page.tsx`, buscar el JSX de `ClientSessionsList`:

```tsx
// ANTES:
sessionsContent={<ClientSessionsList sessions={sessions} clientId={profile.id} />}

// DESPUÉS:
sessionsContent={
  <ClientSessionsList
    sessions={sessions}
    clientId={profile.id}
    hasPlan={profile.activePlan !== null}
  />
}
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/client-sessions-list.tsx src/app/(coach)/coach/clients/[id]/page.tsx
git commit -m "feat(sessions): add summary strip, week grouping, and differentiated empty states"
```

---

## Task 11: Detalle de sesión — completion badge + dots semánticos

**Files:**
- Modify: `src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx`

- [ ] **Actualizar SessionDetailPage**

Agregar helper de dots y completion badge. Reemplazar las secciones relevantes:

```typescript
// Agregar después de la definición de T (constantes de colores):

const LEVEL_COLORS = ['', '#F25252', '#F2994A', '#F2C94A', '#4CAF82', '#B5F23D'] as const

function SemanticDot({ level }: { level: number }) {
  const color = LEVEL_COLORS[Math.min(Math.max(level, 1), 5)] ?? '#6B7280'
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 9999,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  )
}

const ENERGY_LABELS = ['', 'Agotado', 'Bajo', 'Normal', 'Bien', 'Excelente']
const SLEEP_LABELS  = ['', 'Pésimo',  'Mal',  'Regular', 'Bien', 'Muy bien']
const SORENESS_LABELS = ['', 'Mucho', 'Bastante', 'Algo', 'Poco', 'Sin dolor']
```

Reemplazar los bloques de `energyLevel`, `sleepQuality`, `sorenessLevel` dentro del card de métricas:

```tsx
{/* ANTES — energyLevel */}
{session.energyLevel != null && (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Energía</p>
    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
      {['', '💀 Agotado', '😴 Bajo', '😐 Normal', '💪 Bien', '🔥 Excelente'][session.energyLevel]}
    </p>
  </div>
)}

{/* DESPUÉS — energyLevel */}
{session.energyLevel != null && (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Energía</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <SemanticDot level={session.energyLevel} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>
        {ENERGY_LABELS[session.energyLevel] ?? '—'}
      </p>
    </div>
  </div>
)}
```

Aplicar el mismo patrón para `sleepQuality` (usando `SLEEP_LABELS`) y `sorenessLevel` (usando `SORENESS_LABELS`).

Agregar completion badge en el header — justo antes de la lista de ejercicios:

```tsx
{/* Completion badge — antes de la sección EJERCICIOS */}
{(() => {
  const totalPlanned = session.exercises.reduce((s, ex) => s + ex.plannedSets, 0)
  const totalCompleted = session.exercises.reduce(
    (s, ex) => s + ex.sets.filter((set) => set.completed).length,
    0
  )
  if (totalPlanned === 0) return null
  const pct = Math.round((totalCompleted / totalPlanned) * 100)
  const color = pct === 100 ? '#B5F23D' : '#F2C94A'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.muted,
          letterSpacing: '0.1em',
          margin: 0,
        }}
      >
        EJERCICIOS
      </p>
      <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>
        {totalCompleted}/{totalPlanned} series · {pct}%
      </p>
    </div>
  )
})()}
```

Eliminar el overline `EJERCICIOS` existente (que estaba antes del map de ejercicios):
```tsx
{/* ELIMINAR esta línea: */}
<p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>EJERCICIOS</p>
```

Ajustar padding de set rows a mínimo 44px:
```tsx
// En ExerciseCard, dentro del map de sets:
<div
  key={set.setNumber}
  style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 10px',  // era '7px 10px'
    // ... resto igual
  }}
>
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/clients/[id]/sessions/[sessionId]/page.tsx
git commit -m "feat(session-detail): add completion badge, semantic dots, and larger touch targets"
```

---

## Task 12: Dashboard queries — reemplazar listState con computeClientStatus

**Files:**
- Modify: `src/app/(coach)/coach/dashboard/queries.ts`

**Nota de performance:** Esta función llama `computeClientStatus` por cada cliente. Para coaches con ≤15 clientes es aceptable. Si hay muchos más, considerar batch optimization en una fase posterior.

- [ ] **Agregar import de computeClientStatus**

Al inicio de `src/app/(coach)/coach/dashboard/queries.ts`:

```typescript
import { computeClientStatus } from '@/features/clients/utils/compute-client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'
```

- [ ] **Reemplazar el bloque trackingStatus/listState**

En `getDashboardData`, dentro del map de cada cliente (alrededor de líneas 360-385 donde se computa `trackingStatus` y `listState`), reemplazar con:

```typescript
// ELIMINAR todo el bloque de trackingStatus y listState (líneas ~360-385):
// const trackingStatus: 'on_track' | 'attention' | 'critical' | null = ...
// let listState: CoachClientListState
// if (planStatus === 'paused') { ... }

// REEMPLAZAR por:
const status: ClientStatus = await computeClientStatus(clientId, activePlan)
```

Y actualizar el return del cliente para incluir `status` en lugar de `listState` y `trackingStatus`:

```typescript
return {
  id: profile.id,
  fullName: profile.full_name ?? 'Sin nombre',
  goal: cp?.goal ?? null,
  daysPerWeek,
  completedThisWeek: completedInLastWeek,
  hasActivePlan,
  planStatus,
  status,           // <-- nuevo campo
  lastSessionDate,
  daysSinceLastSession,
  weeklyCompliance,
  alerts,
  activePlanEndDate: activePlanEndDateMap.get(profile.id) ?? null,
}
```

También actualizar el tipo `CoachClientListState` o eliminarlo si ya no se usa, y actualizar `CoachClientData` para incluir `status: ClientStatus` en lugar de `listState`.

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: errores en `clients-tabs-container.tsx` y `client-card.tsx` — se arreglan en Task 13.

- [ ] **Commit**

```bash
git add src/app/(coach)/coach/dashboard/queries.ts
git commit -m "feat(status): replace listState computation with computeClientStatus in dashboard"
```

---

## Task 13: ClientCard — usar ClientStatus

**Files:**
- Modify: `src/app/(coach)/coach/clients/client-card.tsx`
- Modify: `src/app/(coach)/coach/clients/clients-tabs-container.tsx` (pasar status en lugar de state)

- [ ] **Actualizar ClientCard para usar ClientStatus**

```typescript
// src/app/(coach)/coach/clients/client-card.tsx
// Reemplazar import del tipo local:
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'

// Eliminar ClientHealthState y STATE_UI existentes.
// Actualizar Props:
type Props = {
  clientId: string
  fullName: string
  status: ClientStatus          // era: state: ClientHealthState
  completedThisWeek: number
  plannedDaysPerWeek: number
  planExpired?: boolean
  daysSinceLastSession?: number | null
}

// Dentro del componente, cambiar:
// const stateUi = STATE_UI[state]
// const accent = stateUi.accent
// Por:
const accent = CLIENT_STATUS_CONFIG[status].color
```

- [ ] **Actualizar clients-tabs-container.tsx para pasar status**

Buscar el lugar donde se renderiza `<ClientCard>` en `clients-tabs-container.tsx` y cambiar el prop `state` por `status`:

```tsx
// ANTES:
<ClientCard
  state={client.listState}
  // ...
/>

// DESPUÉS:
<ClientCard
  status={client.status}
  // ...
/>
```

- [ ] **Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Correr build completo para verificar producción**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build exitoso sin errores de tipos.

- [ ] **Commit final**

```bash
git add src/app/(coach)/coach/clients/client-card.tsx src/app/(coach)/coach/clients/clients-tabs-container.tsx
git commit -m "feat(status): update ClientCard to use ClientStatus — consistent state across app"
```

---

## Self-Review

**Spec coverage:**
- [x] B1 — Sistema de estados → Tasks 1-2-3
- [x] B2 — Tab Progreso (StatusBanner + NavTiles + tendencia) → Task 5-6
- [x] B3 — Check-ins summary strip → Task 7
- [x] B4 — Ejercicios tendencia → Task 8
- [x] B5 — Carga semanal KPI strip + a11y → Task 9
- [x] B6 — Sesiones agrupación + estados vacíos → Task 10
- [x] B7 — Detalle sesión dots + badge → Task 11
- [x] B8 — Listado clientes → Tasks 12-13

**No hay TBDs ni placeholders.**

**Type consistency:**
- `ClientStatus` definido en Task 1, importado en Tasks 2, 3, 4, 5, 6, 12, 13.
- `NavTileStats` definido en Task 5 y consumido en Task 6.
- `computeClientStatus(clientId, activePlan)` — misma firma en Tasks 2, 3, 12.
- `hasPlan` prop en `ClientSessionsList` — definido en Task 10, pasado en Task 10.

**Nota de orden:** Tasks 1 y 2 deben hacerse antes que el resto. Tasks 3 y 4 antes que Tasks 5-6. El resto puede hacerse en cualquier orden.
