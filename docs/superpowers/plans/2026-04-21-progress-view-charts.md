# Plan 6 — Vista de progreso épica con gráficos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/client/progress` de una lista plana a una vista de progreso épica con: (A) gráfico de evolución de peso máximo por ejercicio a lo largo del tiempo, (B) gráfico de curva de peso corporal, (C) estadísticas de racha y sesiones totales.

**Architecture:**
- Instalar `recharts` para gráficos (librería estándar en React, sin bundle muy pesado).
- Ampliar la query de `/client/progress/queries.ts` para devolver series temporales por ejercicio (peso máximo por semana) y serie temporal de peso corporal.
- Dividir la vista en 3 pestañas: "Ejercicios" (lista de PRs clickeable → gráfico), "Cuerpo" (gráfico peso corporal), "Estadísticas" (racha, sesiones totales).
- Los gráficos son client components que reciben datos como props (no fetch propio).

**Tech Stack:** Next.js 15, TypeScript, Recharts, Supabase, inline styles

---

## Archivos involucrados

- Run: `npm install recharts`
- Modify: `src/app/(client)/client/progress/queries.ts`
- Modify: `src/app/(client)/client/progress/page.tsx`
- Modify: `src/app/(client)/client/progress/progress-view.tsx`
- Create: `src/app/(client)/client/progress/exercise-progress-chart.tsx`
- Create: `src/app/(client)/client/progress/body-weight-chart.tsx`
- Create: `src/app/(client)/client/progress/stats-view.tsx`

---

## Task 1: Instalar recharts

- [ ] **Step 1: Instalar**

```bash
npm install recharts
```

- [ ] **Step 2: Verificar que se instaló**

```bash
cat package.json | grep recharts
```

Expected: `"recharts": "^2.x.x"`

---

## Task 2: Ampliar la query de progreso

**Files:**
- Modify: `src/app/(client)/client/progress/queries.ts`

- [ ] **Step 1: Leer la query actual**

```bash
cat src/app/\(client\)/client/progress/queries.ts
```

- [ ] **Step 2: Agregar tipos y queries para series temporales**

Agregar al final del archivo:

```typescript
export type ExerciseWeeklyMax = {
  weekLabel: string  // "Sem 1", "Sem 2", etc.
  maxWeightKg: number
}

export type ExerciseProgressSeries = {
  exerciseId: string
  exerciseName: string
  series: ExerciseWeeklyMax[]
  currentMax: number | null
}

export type BodyWeightPoint = {
  dateLabel: string  // "12 abr"
  weightKg: number
}

export type ClientProgressStats = {
  totalSessions: number
  currentStreak: number  // días consecutivos de semanas activas
  longestStreak: number
}

export async function getExerciseProgressSeries(
  clientId: string
): Promise<ExerciseProgressSeries[]> {
  const supabase = await createClient()

  // Obtener todos los session_sets del cliente agrupados por ejercicio y semana
  const { data, error } = await supabase
    .from('session_sets')
    .select(`
      weight_kg,
      sessions!inner (
        client_id,
        date,
        client_plan_days!inner (
          week_number,
          client_plan_day_exercises!inner (
            exercises ( id, name )
          )
        )
      )
    `)
    .eq('sessions.client_id', clientId)
    .eq('completed', true)
    .not('weight_kg', 'is', null)
    .order('sessions(date)', { ascending: true })

  if (error || !data) return []

  type Row = {
    weight_kg: number
    sessions: {
      date: string
      client_plan_days: {
        week_number: number
        client_plan_day_exercises: {
          exercises: { id: string; name: string } | null
        }
      }
    }
  }

  // Agrupar por ejercicio y semana
  const byExercise = new Map<string, { name: string; byWeek: Map<number, number> }>()

  for (const row of data as Row[]) {
    const ex = row.sessions.client_plan_days.client_plan_day_exercises.exercises
    if (!ex) continue
    const weekNum = row.sessions.client_plan_days.week_number
    const weight = row.weight_kg

    if (!byExercise.has(ex.id)) {
      byExercise.set(ex.id, { name: ex.name, byWeek: new Map() })
    }
    const entry = byExercise.get(ex.id)!
    const current = entry.byWeek.get(weekNum) ?? 0
    if (weight > current) entry.byWeek.set(weekNum, weight)
  }

  const result: ExerciseProgressSeries[] = []

  for (const [exerciseId, { name, byWeek }] of byExercise.entries()) {
    const sortedWeeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0])
    const series: ExerciseWeeklyMax[] = sortedWeeks.map(([weekNum, maxW]) => ({
      weekLabel: `Sem ${weekNum}`,
      maxWeightKg: maxW,
    }))
    const currentMax = series.length > 0 ? series[series.length - 1].maxWeightKg : null
    result.push({ exerciseId, exerciseName: name, series, currentMax })
  }

  // Ordenar por ejercicios con más progreso primero
  result.sort((a, b) => (b.currentMax ?? 0) - (a.currentMax ?? 0))
  return result
}

export async function getBodyWeightSeries(clientId: string): Promise<BodyWeightPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('body_measurements')
    .select('date, weight_kg')
    .eq('client_id', clientId)
    .order('date', { ascending: true })
    .limit(52) // máximo 1 año de datos

  if (error || !data) return []

  return data.map((m) => ({
    dateLabel: new Date(m.date + 'T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short',
    }),
    weightKg: Number(m.weight_kg),
  }))
}

export async function getClientProgressStats(clientId: string): Promise<ClientProgressStats> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed')

  // Calcular racha: semanas consecutivas con al menos 1 sesión completada
  const { data: sessions } = await supabase
    .from('sessions')
    .select('date')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('date', { ascending: false })

  function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDay()
    const diff = (day + 6) % 7
    d.setDate(d.getDate() - diff)
    return d.toISOString().split('T')[0]
  }

  const weeks = new Set((sessions ?? []).map((s) => getWeekKey(s.date)))
  const currentWeekKey = getWeekKey(new Date().toISOString().split('T')[0])

  let streak = 0
  const checkDate = new Date()
  while (true) {
    const key = getWeekKey(checkDate.toISOString().split('T')[0])
    if (!weeks.has(key)) break
    streak++
    checkDate.setDate(checkDate.getDate() - 7)
  }

  return {
    totalSessions: count ?? 0,
    currentStreak: streak,
    longestStreak: streak, // simplificado — calcular histórico máximo requiere más lógica
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: Gráfico de progreso por ejercicio

**Files:**
- Create: `src/app/(client)/client/progress/exercise-progress-chart.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ExerciseProgressSeries } from './queries'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

function PRCard({
  ex,
  selected,
  onClick,
}: {
  ex: ExerciseProgressSeries
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          backgroundColor: selected ? 'rgba(181,242,61,0.06)' : T.card,
          border: `1px solid ${selected ? 'rgba(181,242,61,0.3)' : T.border}`,
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>{ex.exerciseName}</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
            {ex.series.length} semanas registradas
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {ex.currentMax != null ? (
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.lime }}>
              {ex.currentMax} kg
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Sin peso</p>
          )}
        </div>
      </div>

      {selected && ex.series.length > 1 && (
        <div
          style={{
            backgroundColor: T.card,
            border: `1px solid ${T.border}`,
            borderTop: 'none',
            borderRadius: '0 0 14px 14px',
            padding: '12px 4px 4px',
          }}
        >
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={ex.series} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: T.muted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: T.muted }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1D23',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: T.text,
                }}
                formatter={(value: number) => [`${value} kg`, 'Peso máximo']}
              />
              <Line
                type="monotone"
                dataKey="maxWeightKg"
                stroke={T.lime}
                strokeWidth={2}
                dot={{ r: 3, fill: T.lime, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: T.lime }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  )
}

export default function ExerciseProgressChart({
  series,
}: {
  series: ExerciseProgressSeries[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (series.length === 0) {
    return (
      <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
        Completá tu primer entrenamiento con pesos para ver tu progreso.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {series.map((ex) => (
        <PRCard
          key={ex.exerciseId}
          ex={ex}
          selected={selectedId === ex.exerciseId}
          onClick={() => setSelectedId(selectedId === ex.exerciseId ? null : ex.exerciseId)}
        />
      ))}
    </div>
  )
}
```

---

## Task 4: Gráfico de peso corporal

**Files:**
- Create: `src/app/(client)/client/progress/body-weight-chart.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { BodyWeightPoint } from './queries'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280',
} as const

export default function BodyWeightChart({ data }: { data: BodyWeightPoint[] }) {
  if (data.length < 2) {
    return (
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 16px' }}>
        <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', margin: 0 }}>
          {data.length === 0
            ? 'No hay mediciones de peso registradas todavía.'
            : 'Registrá al menos 2 mediciones para ver la curva.'}
        </p>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const first = data[0]
  const diff = latest.weightKg - first.weightKg
  const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>Peso actual</p>
          <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 800, color: T.text }}>
            {latest.weightKg} <span style={{ fontSize: 16, fontWeight: 400 }}>kg</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: T.muted }}>Desde el inicio</p>
          <p style={{
            margin: '2px 0 0', fontSize: 16, fontWeight: 700,
            color: diff <= 0 ? T.lime : '#F25252',
          }}>
            {diffStr} kg
          </p>
        </div>
      </div>
      <div style={{ padding: '12px 0 8px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B5F23D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#B5F23D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1D23', border: `1px solid #1F2227`,
                borderRadius: 8, fontSize: 12, color: T.text,
              }}
              formatter={(v: number) => [`${v} kg`, 'Peso']}
            />
            <Area
              type="monotone"
              dataKey="weightKg"
              stroke={T.lime}
              strokeWidth={2}
              fill="url(#weightGrad)"
              dot={{ r: 3, fill: T.lime, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

---

## Task 5: Stats view

**Files:**
- Create: `src/app/(client)/client/progress/stats-view.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
import type { ClientProgressStats } from './queries'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

function StatCard({ value, label, unit }: { value: number; label: string; unit?: string }) {
  return (
    <div
      style={{
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: '20px 16px', textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: T.lime }}>
        {value}
        {unit && <span style={{ fontSize: 18, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: T.secondary }}>{label}</p>
    </div>
  )
}

export default function StatsView({ stats }: { stats: ClientProgressStats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard value={stats.totalSessions} label="Sesiones completadas" />
        <StatCard value={stats.currentStreak} label="Semanas activas seguidas" />
      </div>
      {stats.totalSessions === 0 && (
        <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', paddingTop: 20 }}>
          Completá tu primera sesión para ver tus estadísticas.
        </p>
      )}
    </div>
  )
}
```

---

## Task 6: Reescribir progress page con nuevas queries y componentes

**Files:**
- Modify: `src/app/(client)/client/progress/page.tsx`
- Modify: `src/app/(client)/client/progress/progress-view.tsx`

- [ ] **Step 1: Leer la page actual**

```bash
cat src/app/\(client\)/client/progress/page.tsx
```

- [ ] **Step 2: Actualizar page.tsx para llamar las nuevas queries en paralelo**

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientProgressData } from './queries'
import { getExerciseProgressSeries, getBodyWeightSeries, getClientProgressStats } from './queries'
import ProgressView from './progress-view'

export default async function ProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [data, exerciseSeries, bodyWeight, stats] = await Promise.all([
    getClientProgressData(user.id),
    getExerciseProgressSeries(user.id),
    getBodyWeightSeries(user.id),
    getClientProgressStats(user.id),
  ])

  return (
    <ProgressView
      clientId={user.id}
      data={data}
      exerciseSeries={exerciseSeries}
      bodyWeight={bodyWeight}
      stats={stats}
    />
  )
}
```

- [ ] **Step 3: Actualizar progress-view.tsx con las 3 tabs**

Reemplazar el contenido completo de `progress-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { ClientProgressData } from '@/features/training/types'
import type { ExerciseProgressSeries, BodyWeightPoint, ClientProgressStats } from './queries'
import ExerciseProgressChart from './exercise-progress-chart'
import BodyWeightChart from './body-weight-chart'
import StatsView from './stats-view'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

type Tab = 'ejercicios' | 'cuerpo' | 'stats'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ejercicios', label: 'Ejercicios' },
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'stats', label: 'Estadísticas' },
]

export default function ProgressView({
  exerciseSeries,
  bodyWeight,
  stats,
}: {
  clientId: string
  data: ClientProgressData
  exerciseSeries: ExerciseProgressSeries[]
  bodyWeight: BodyWeightPoint[]
  stats: ClientProgressStats
}) {
  const [tab, setTab] = useState<Tab>('ejercicios')

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Mi progreso</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 0', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 20, whiteSpace: 'nowrap',
              border: tab === t.key ? `1.5px solid ${T.lime}` : `1px solid ${T.border}`,
              backgroundColor: tab === t.key ? 'rgba(181,242,61,0.1)' : T.card,
              color: tab === t.key ? T.lime : T.secondary,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {tab === 'ejercicios' && <ExerciseProgressChart series={exerciseSeries} />}
        {tab === 'cuerpo' && <BodyWeightChart data={bodyWeight} />}
        {tab === 'stats' && <StatsView stats={stats} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(client\)/client/progress/
git commit -m "feat(client): epic progress view with exercise charts, body weight curve, and stats"
```

---

## Verificación final del Plan 6

- [ ] Abrir `/client/progress` → ver 3 tabs: Ejercicios / Cuerpo / Estadísticas
- [ ] Tab Ejercicios: lista de ejercicios con PR actual → click en uno → expande gráfico de evolución semanal
- [ ] Tab Cuerpo: gráfico de curva de peso corporal con área sombreada, peso actual y diferencia desde inicio
- [ ] Tab Estadísticas: tarjetas con sesiones totales y semanas activas seguidas

```bash
npx tsc --noEmit
```

Expected: 0 errores
