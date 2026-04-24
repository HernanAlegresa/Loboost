'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PlanDetailWeek } from '../queries'

const T = {
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const WEEK_TYPE_LABEL: Record<string, string> = {
  normal: 'Normal',
  deload: 'Deload',
  peak: 'Peak',
  test: 'Test',
}

function repsLabel(repsMin: number | null, repsMax: number | null): string {
  if (repsMin == null) return ''
  if (repsMax != null && repsMax !== repsMin) return `${repsMin}–${repsMax} reps`
  return `${repsMin} reps`
}

export default function WeekCollapsibleCard({ week }: { week: PlanDetailWeek }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          border: 'none',
          cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: 'transparent',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'left' }}>
          Semana {week.weekNumber}
          {week.weekName ? ` — ${week.weekName}` : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.lime,
              backgroundColor: 'rgba(181,242,61,0.1)',
              padding: '2px 8px',
              borderRadius: 20,
            }}
          >
            {WEEK_TYPE_LABEL[week.weekType] ?? week.weekType}
          </span>
          <ChevronDown
            size={18}
            color="#B5F23D"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
          />
        </div>
      </button>

      {isOpen ? (
        week.days.length === 0 ? (
          <p style={{ padding: '0 16px 12px', fontSize: 13, color: T.muted, margin: 0 }}>Sin días configurados</p>
        ) : (
          week.days.map((day) => (
            <div key={day.id} style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.05em' }}>
                {DAY_NAMES[day.dayOfWeek]}
              </p>
              {day.exercises.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: `1px solid rgba(31,34,39,0.5)`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: T.text }}>{ex.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: T.secondary }}>
                    {ex.sets} × {ex.type === 'cardio' ? `${ex.durationSeconds}s` : repsLabel(ex.repsMin, ex.repsMax)}
                  </p>
                </div>
              ))}
            </div>
          ))
        )
      ) : null}
    </div>
  )
}
