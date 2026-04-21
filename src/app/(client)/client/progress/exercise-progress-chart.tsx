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
          borderRadius: selected && ex.series.length > 1 ? '14px 14px 0 0' : 14,
          padding: '14px 16px',
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
                formatter={(value) => [`${value} kg`, 'Peso máximo']}
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
