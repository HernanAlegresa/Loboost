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
          padding: 28,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 28, marginBottom: 10 }}>💤</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#4B5563' }}>
          Hoy es día de descanso
        </p>
        <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
          Recuperate bien.
        </p>
      </div>
    )
  }

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

  const exerciseCount = day.exercises.length

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: `1px solid ${
          isCompleted
            ? 'rgba(181,242,61,0.3)'
            : isInProgress
              ? 'rgba(242,153,74,0.3)'
              : '#1F2227'
        }`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {isInProgress && (
        <div
          style={{
            backgroundColor: 'rgba(242,153,74,0.15)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(242,153,74,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F2994A' }}>
              Falta completar el registro de tu sesión
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              Tocá para terminar de cargar los datos
            </p>
          </div>
          <button
            type="button"
            onClick={handleResume}
            style={{
              padding: '7px 14px',
              backgroundColor: '#F2994A',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Retomar
          </button>
        </div>
      )}

      {isCompleted && (
        <div
          style={{
            backgroundColor: 'rgba(181,242,61,0.1)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(181,242,61,0.15)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: '#B5F23D' }}>
            ✓ Entrenamiento completado
          </p>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        {exerciseCount > 0 ? (
          <>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
              {exerciseCount}{' '}
              {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} planificados
            </p>
            {day.exercises.slice(0, 3).map((ex, i) => (
              <div
                key={ex.clientPlanDayExerciseId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
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
            ))}
            {exerciseCount > 3 && (
              <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>
                +{exerciseCount - 3} ejercicios más
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#4B5563' }}>
            Sin ejercicios planificados para hoy.
          </p>
        )}
      </div>

      {!isCompleted && !isInProgress && exerciseCount > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={handleStart}
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
            {isPending ? 'Cargando...' : 'Empezar entrenamiento'}
          </button>
        </div>
      )}
    </div>
  )
}
