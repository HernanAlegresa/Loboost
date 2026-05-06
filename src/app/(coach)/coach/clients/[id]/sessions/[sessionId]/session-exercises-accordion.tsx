'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SessionExerciseDetail } from './queries'

const T = {
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
  lime: '#B5F23D',
} as const

function repsRange(min: number | null, max: number | null): string {
  if (min == null) return '—'
  if (max != null && max !== min) return `${min}–${max}`
  return String(min)
}

/** Detalle del plan (sin repetir el conteo de series; va junto a “x/y series”). */
function planDetailLine(ex: SessionExerciseDetail): string {
  if (ex.type === 'strength') {
    return `${repsRange(ex.plannedRepsMin, ex.plannedRepsMax)} reps`
  }
  if (ex.plannedDurationSeconds != null) {
    return `${ex.plannedDurationSeconds}s`
  }
  return 'Plan'
}

function exerciseCompletionBadge(ex: SessionExerciseDetail): { label: string; color: string; bg: string } {
  const planned = ex.plannedSets
  const completed = ex.sets.filter((s) => s.completed).length
  if (planned > 0 && completed >= planned) {
    return { label: 'Completo', color: '#0A0A0A', bg: 'rgba(74,222,128,0.55)' }
  }
  if (completed > 0) {
    return { label: 'Parcial', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' }
  }
  if (ex.sets.length > 0) {
    return { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' }
  }
  return { label: 'Sin datos', color: '#9CA3AF', bg: 'rgba(156,163,175,0.14)' }
}

type Props = {
  exercises: SessionExerciseDetail[]
}

export default function SessionExercisesAccordion({ exercises }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {exercises.map((ex) => {
        const isExpanded = expandedId === ex.clientPlanDayExerciseId
        const completedSets = ex.sets.filter((s) => s.completed).length
        const badge = exerciseCompletionBadge(ex)

        return (
          <div key={ex.clientPlanDayExerciseId}>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedId((prev) => (prev === ex.clientPlanDayExerciseId ? null : ex.clientPlanDayExerciseId))
              }
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: 'transparent',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
                borderRadius: 8,
                borderBottom: '1.5px solid rgba(181,242,61,0.4)',
                padding: '13px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingRight: 10 }}>
                <p
                  style={{
                    margin: 0,
                    color: T.text,
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {ex.name}
                </p>
                <p style={{ margin: 0, color: T.secondary, fontSize: 12, lineHeight: 1.35 }}>
                  <span style={{ color: T.lime, fontWeight: 700 }}>
                    {completedSets}/{ex.plannedSets}
                  </span>{' '}
                  series · {planDetailLine(ex)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: badge.color,
                    backgroundColor: badge.bg,
                    borderRadius: 999,
                    padding: '4px 8px',
                  }}
                >
                  {badge.label}
                </span>
                {isExpanded ? <ChevronUp size={16} color="#B5F23D" /> : <ChevronDown size={16} color="#B5F23D" />}
              </div>
            </button>

            {isExpanded ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginTop: 8,
                  marginLeft: 14,
                  marginRight: 18,
                  paddingLeft: 10,
                  borderLeft: '1px solid rgba(181,242,61,0.8)',
                }}
              >
                {ex.sets.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.muted, margin: '4px 0 0' }}>Sin series registradas</p>
                ) : (
                  ex.sets.map((set) => (
                    <div
                      key={set.setNumber}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 10px',
                        backgroundColor: set.completed ? 'rgba(181,242,61,0.06)' : 'rgba(255,255,255,0.02)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, color: T.muted, minWidth: 52 }}>Serie {set.setNumber}</span>
                      <span style={{ fontSize: 13, color: T.secondary, flex: 1 }}>
                        {ex.type === 'strength'
                          ? set.weightKg != null
                            ? `${set.weightKg} kg × ${set.repsPerformed ?? '—'} reps`
                            : `— × ${set.repsPerformed ?? '—'} reps`
                          : set.durationSeconds != null
                            ? `${set.durationSeconds} seg`
                            : '—'}
                      </span>
                      {set.completed ? <span style={{ fontSize: 13, color: T.lime }}>✓</span> : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
