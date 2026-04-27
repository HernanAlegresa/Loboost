'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExerciseWeekGrid } from '../../progress-queries'

export default function ExerciseWeekGrid({
  weeks,
  currentPlanWeek,
  isBodyweight,
}: {
  weeks: ExerciseWeekGrid[]
  currentPlanWeek: number
  isBodyweight: boolean
}) {
  // Default to the most recent week with data
  const [weekIdx, setWeekIdx] = useState(weeks.length > 0 ? weeks.length - 1 : 0)

  if (weeks.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#4B5563' }}>Sin sesiones registradas aún.</p>
      </div>
    )
  }

  const week = weeks[weekIdx]
  const canPrev = weekIdx > 0
  const canNext = weekIdx < weeks.length - 1
  const isCurrentWeek = week.weekNumber === currentPlanWeek

  return (
    <div style={{ padding: '6px 20px 0' }}>
      {/* Week navigator — padding lateral para acercar flechas al centro */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          marginBottom: 16,
          padding: '0 20px',
        }}
      >
        <button
          type="button"
          onClick={() => setWeekIdx((i) => i - 1)}
          disabled={!canPrev}
          style={{
            background: 'none',
            border: 'none',
            cursor: canPrev ? 'pointer' : 'default',
            padding: 2,
            opacity: canPrev ? 1 : 0.2,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={30} strokeWidth={2.25} color="#B5F23D" />
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textAlign: 'center',
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
            Semana {week.weekNumber}
          </span>
          {isCurrentWeek && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#B5F23D',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Actual
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setWeekIdx((i) => i + 1)}
          disabled={!canNext}
          style={{
            background: 'none',
            border: 'none',
            cursor: canNext ? 'pointer' : 'default',
            padding: 2,
            opacity: canNext ? 1 : 0.2,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ChevronRight size={30} strokeWidth={2.25} color="#B5F23D" />
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          background: 'transparent',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: Math.max(1, week.maxSets) * 80 + 120,
            }}
          >
            <thead>
              <tr>
                <th
                  aria-label="Día de la sesión"
                  style={{
                    width: 120,
                    padding: '12px 14px 10px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#4B5563',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid #1A1E24',
                  }}
                />
                {week.maxSets === 0 ? (
                  <th
                    style={{
                      padding: '12px 10px 10px',
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#4B5563',
                      borderBottom: '1px solid #1A1E24',
                    }}
                  >
                    —
                  </th>
                ) : (
                  Array.from({ length: week.maxSets }, (_, i) => (
                    <th
                      key={i + 1}
                      style={{
                        padding: '12px 10px 10px',
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#9CA3AF',
                        borderBottom: '1px solid #1A1E24',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      S{i + 1}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {week.days.map((day, rowIdx) => (
                <tr key={day.date}>
                  <td
                    style={{
                      padding: '11px 14px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#9CA3AF',
                      borderTop: rowIdx > 0 ? '1px solid #1A1E24' : undefined,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {day.dayLabel}
                  </td>
                  {day.sets.length === 0 ? (
                    <td
                      key="empty"
                      colSpan={Math.max(1, week.maxSets)}
                      style={{
                        padding: '11px 10px',
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: 400,
                        color: '#2D3340',
                        borderTop: rowIdx > 0 ? '1px solid #1A1E24' : undefined,
                      }}
                    >
                      —
                    </td>
                  ) : (
                    Array.from({ length: week.maxSets }, (_, i) => {
                      const set = day.sets[i]
                      const kg = set?.weightKg ?? null
                      const hasValue = kg !== null
                      return (
                        <td
                          key={i}
                          style={{
                            padding: '11px 10px',
                            textAlign: 'center',
                            fontSize: 15,
                            fontWeight: hasValue ? 600 : 400,
                            color: hasValue ? '#B5F23D' : '#2D3340',
                            borderTop: rowIdx > 0 ? '1px solid #1A1E24' : undefined,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isBodyweight ? 'PC' : hasValue ? `${kg} kg` : '—'}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
