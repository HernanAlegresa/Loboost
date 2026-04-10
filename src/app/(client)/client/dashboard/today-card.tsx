'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import type { TodayDayData } from '@/features/training/types'

export default function TodayCard({ today }: { today: TodayDayData | null }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!today) {
    return (
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 22, marginBottom: 8 }}>💤</p>
        <p style={{ fontSize: 14, color: '#4B5563' }}>Día de descanso</p>
        <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
          Descansá, mañana volvemos.
        </p>
      </div>
    )
  }

  // Capture as non-null local — TypeScript doesn't narrow props inside closures
  const day = today

  const isCompleted = day.sessionStatus === 'completed'
  const isInProgress = day.sessionStatus === 'in_progress'

  function handleStart() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientPlanDayId', day.clientPlanDayId)
      const result = await startSessionAction(formData)
      if (result.success && result.sessionId) {
        router.push(`/client/training/${result.sessionId}`)
      }
    })
  }

  function handleResume() {
    if (day.existingSessionId) {
      router.push(`/client/training/${day.existingSessionId}`)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Status banner */}
      {isCompleted && (
        <div
          style={{
            backgroundColor: 'rgba(181,242,61,0.1)',
            padding: '8px 16px',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#B5F23D' }}>
            ✓ Entrenamiento completado
          </p>
        </div>
      )}
      {isInProgress && (
        <div
          style={{
            backgroundColor: 'rgba(242,153,74,0.1)',
            padding: '8px 16px',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#F2994A' }}>
            En progreso — podés retomar
          </p>
        </div>
      )}

      {/* Exercise list */}
      <div style={{ padding: '14px 16px' }}>
        {day.exercises.length === 0 ? (
          <p style={{ fontSize: 13, color: '#4B5563' }}>
            Sin ejercicios planificados para hoy.
          </p>
        ) : (
          day.exercises.map((ex, i) => (
            <div
              key={ex.clientPlanDayExerciseId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 0',
                borderTop: i > 0 ? '1px solid #1A1D22' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: '#F0F0F0' }}>{ex.name}</span>
              <span
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {ex.plannedSets} ×{' '}
                {ex.plannedReps != null
                  ? `${ex.plannedReps} reps`
                  : ex.plannedDurationSeconds != null
                  ? `${ex.plannedDurationSeconds}s`
                  : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      {!isCompleted && day.exercises.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={isInProgress ? handleResume : handleStart}
            disabled={isPending}
            style={{
              width: '100%',
              padding: 14,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 12,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending
              ? 'Cargando...'
              : isInProgress
              ? 'Retomar entrenamiento'
              : 'Iniciar entrenamiento'}
          </button>
        </div>
      )}
    </div>
  )
}
