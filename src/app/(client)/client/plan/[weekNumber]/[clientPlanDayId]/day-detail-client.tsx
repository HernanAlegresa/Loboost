'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import VideoModal from '@/components/ui/video-modal'
import type { DayDetailData } from '@/features/training/types'

function formatDateNumeric(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

export default function DayDetailClient({ data }: { data: DayDetailData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const isToday = data.dayStatus === 'today'
  const isUpcoming = data.dayStatus === 'upcoming'
  const isCompleted = data.sessionStatus === 'completed'
  const isInProgress = data.sessionStatus === 'in_progress'

  function handleStart() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientPlanDayId', data.clientPlanDayId)
      const result = await startSessionAction(formData)
      if (result.success && result.sessionId) {
        router.push(`/client/training/${result.sessionId}`)
      }
    })
  }

  function handleResume() {
    if (data.sessionId) {
      router.push(`/client/training/${data.sessionId}`)
    }
  }

  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {data.exercises.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: '#4B5563',
            textAlign: 'center',
            padding: 20,
          }}
        >
          Sin ejercicios para este día.
        </p>
      ) : (
        data.exercises.map((ex) => (
          <div
            key={ex.clientPlanDayExerciseId}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F0' }}>
                  {ex.name}
                </p>
                {ex.muscleGroup && (
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {ex.muscleGroup}
                  </p>
                )}
              </div>
              {ex.videoUrl && (
                <button
                  type="button"
                  onClick={() => ex.videoUrl && setVideoUrl(ex.videoUrl)}
                  style={{
                    background: 'none',
                    border: '1px solid #2A2D34',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: '#B5F23D',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    flexShrink: 0,
                    marginLeft: 10,
                  }}
                >
                  Video
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              {ex.plannedSets} series ×{' '}
              {ex.plannedRepsMin != null
                ? ex.plannedRepsMax != null && ex.plannedRepsMax !== ex.plannedRepsMin
                  ? `${ex.plannedRepsMin}–${ex.plannedRepsMax} reps`
                  : `${ex.plannedRepsMin} reps`
                : ex.plannedDurationSeconds != null
                  ? `${ex.plannedDurationSeconds}s`
                  : '—'}
              {ex.restSeconds != null ? ` · ${ex.restSeconds}s descanso` : ''}
            </p>
          </div>
        ))
      )}

      {isCompleted && data.sessionId && (
        <button
          type="button"
          onClick={() => router.push(`/client/training/${data.sessionId}`)}
          style={{
            marginTop: 8,
            width: '100%',
            padding: 14,
            backgroundColor: 'transparent',
            border: '1px solid #2A2D34',
            borderRadius: 12,
            color: '#6B7280',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Ver y editar datos registrados
        </button>
      )}

      {!isCompleted && !isUpcoming && data.exercises.length > 0 && (
        <button
          type="button"
          onClick={isInProgress ? handleResume : handleStart}
          disabled={isPending}
          style={{
            marginTop: 8,
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
              : isToday
                ? 'Empezar entrenamiento'
                : 'Registrar entrenamiento'}
        </button>
      )}

      {isUpcoming && (
        <div
          style={{
            marginTop: 8,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px dashed #2A2D34',
            backgroundColor: '#111317',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF' }}>
            Aun no disponible
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Este entrenamiento se habilita el {formatDateNumeric(data.dateISO)}.
          </p>
        </div>
      )}

      {videoUrl && (
        <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      )}
    </div>
  )
}
