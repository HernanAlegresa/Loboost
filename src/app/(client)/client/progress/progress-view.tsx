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
