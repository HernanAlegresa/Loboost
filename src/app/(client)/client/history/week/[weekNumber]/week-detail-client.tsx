'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { WeekDetailData, WeekDetailSession } from '@/features/training/types'

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
        <div
          style={{
            borderTop: '1px solid #1F2227',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {session.exercises.map((ex) => (
            <div key={ex.clientPlanDayExerciseId}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0', marginBottom: 6 }}>
                {ex.name}
                {ex.muscleGroup && (
                  <span
                    style={{ fontSize: 11, color: '#6B7280', fontWeight: 400, marginLeft: 6 }}
                  >
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
        data.sessions.map((sess) => <SessionCard key={sess.sessionId} session={sess} />)
      )}
    </div>
  )
}
