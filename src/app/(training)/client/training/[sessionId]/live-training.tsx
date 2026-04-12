'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import { updateSetAction } from '@/features/training/actions/update-set'
import VideoModal from '@/components/ui/video-modal'
import type { LiveSessionData } from '@/features/training/types'
import { SAFE_HEADER_PADDING_TOP_COMPACT } from '@/lib/ui/safe-area'

type SetInputs = { weight: string; duration: string }

function makeKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

export default function LiveTraining({ session }: { session: LiveSessionData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFinished, setIsFinished] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (session.exercises.length === 0) return 0
    for (let i = 0; i < session.exercises.length; i++) {
      const ex = session.exercises[i]!
      const allDone = Array.from({ length: ex.plannedSets }, (_, j) => j + 1).every(
        (n) => ex.loggedSets.find((s) => s.setNumber === n)?.completed
      )
      if (!allDone) return i
    }
    return session.exercises.length - 1
  })

  const [localCompleted, setLocalCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
      }
    }
    return s
  })

  const [inputs, setInputs] = useState<Map<string, SetInputs>>(() => {
    const m = new Map<string, SetInputs>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        m.set(makeKey(ex.clientPlanDayExerciseId, set.setNumber), {
          weight: set.weightKg != null ? String(set.weightKg) : '',
          duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
        })
      }
    }
    return m
  })

  if (session.exercises.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 40,
          paddingRight: 40,
          paddingBottom: 40,
          paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 15, color: '#9CA3AF' }}>
          No hay ejercicios en esta sesión.
        </p>
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1F2227',
            border: '1px solid #2A2D34',
            borderRadius: 12,
            color: '#F0F0F0',
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const currentEx = session.exercises[currentIndex]!
  const setNumbers = Array.from({ length: currentEx.plannedSets }, (_, i) => i + 1)
  const allCurrentDone = setNumbers.every((n) =>
    localCompleted.has(makeKey(currentEx.clientPlanDayExerciseId, n))
  )
  const isLastExercise = currentIndex === session.exercises.length - 1
  const isFirstExercise = currentIndex === 0

  function getInput(exId: string, setNum: number): SetInputs {
    return inputs.get(makeKey(exId, setNum)) ?? { weight: '', duration: '' }
  }

  function updateInput(exId: string, setNum: number, patch: Partial<SetInputs>) {
    setInputs((prev) => {
      const next = new Map(prev)
      next.set(makeKey(exId, setNum), { ...getInput(exId, setNum), ...patch })
      return next
    })
  }

  function handleCompleteSet(setNumber: number) {
    const key = makeKey(currentEx.clientPlanDayExerciseId, setNumber)
    const inp = getInput(currentEx.clientPlanDayExerciseId, setNumber)

    setLocalCompleted((prev) => new Set([...prev, key]))

    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', currentEx.clientPlanDayExerciseId)
      formData.set('setNumber', String(setNumber))
      if (currentEx.type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
      if (currentEx.type === 'cardio' && inp.duration)
        formData.set('durationSeconds', inp.duration)

      const result = await completeSetAction(formData)
      if (result.error) {
        setLocalCompleted((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    })
  }

  function handleFinish() {
    startTransition(async () => {
      await completeSessionAction(session.sessionId)
      setIsFinished(true)
    })
  }

  function handleUpdateSet(setNumber: number) {
    const inp = getInput(currentEx.clientPlanDayExerciseId, setNumber)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', currentEx.clientPlanDayExerciseId)
      formData.set('setNumber', String(setNumber))
      if (currentEx.type === 'strength') formData.set('weightKg', inp.weight)
      if (currentEx.type === 'cardio') formData.set('durationSeconds', inp.duration)
      const result = await updateSetAction(formData)
      if (result.success) setEditingKey(null)
    })
  }

  if (isFinished) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 40,
          paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
          gap: 20,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 52 }}>🏆</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F0' }}>
          ¡Entrenamiento completado!
        </p>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Excelente trabajo. Seguí así.</p>
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            marginTop: 8,
            padding: '14px 32px',
            backgroundColor: '#B5F23D',
            color: '#0A0A0A',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 14,
          paddingTop: SAFE_HEADER_PADDING_TOP_COMPACT,
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>
            Ejercicio {currentIndex + 1} de {session.exercises.length}
          </p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0', marginTop: 1 }}>
            {currentEx.name}
          </p>
          {currentEx.muscleGroup && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              {currentEx.muscleGroup}
            </p>
          )}
        </div>
        {currentEx.videoUrl && (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            style={{
              background: 'none',
              border: '1px solid #2A2D34',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#B5F23D',
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 10px',
              flexShrink: 0,
            }}
          >
            Video
          </button>
        )}
      </div>

      {(currentEx.plannedReps != null || currentEx.plannedDurationSeconds != null) && (
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: 'rgba(181,242,61,0.06)',
            borderBottom: '1px solid #1F2227',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>
            Objetivo: {currentEx.plannedSets} series ×{' '}
            {currentEx.plannedReps != null
              ? `${currentEx.plannedReps} reps`
              : `${currentEx.plannedDurationSeconds}s`}
            {currentEx.restSeconds != null ? ` · ${currentEx.restSeconds}s descanso` : ''}
          </p>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {setNumbers.map((setNum) => {
          const key = makeKey(currentEx.clientPlanDayExerciseId, setNum)
          const isDone = localCompleted.has(key)
          const inp = getInput(currentEx.clientPlanDayExerciseId, setNum)

          return (
            <div
              key={setNum}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#111317',
                border: `1px solid ${isDone ? 'rgba(181,242,61,0.3)' : '#1F2227'}`,
                borderRadius: 12,
                padding: '12px 16px',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  minWidth: 58,
                  flexShrink: 0,
                }}
              >
                Serie {setNum}
              </span>

              {isDone && editingKey !== key ? (
                // Completed — show values + edit trigger
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                    {currentEx.type === 'strength'
                      ? `${inp.weight || '—'} kg × ${currentEx.plannedReps ?? '—'} reps`
                      : `${inp.duration || '—'} seg`}
                  </span>
                  <span style={{ fontSize: 14, color: '#B5F23D', marginLeft: 'auto' }}>✓</span>
                  <button
                    type="button"
                    onClick={() => setEditingKey(key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4B5563',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 6px',
                      flexShrink: 0,
                    }}
                  >
                    Editar
                  </button>
                </div>
              ) : isDone && editingKey === key ? (
                // Edit mode — pre-filled inputs + Guardar + Cancel
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentEx.type === 'strength' ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="kg"
                      value={inp.weight}
                      onChange={(e) =>
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
                          weight: e.target.value,
                        })
                      }
                      style={{
                        width: 62,
                        padding: '7px 8px',
                        backgroundColor: '#1A1D22',
                        border: '1px solid #B5F23D',
                        borderRadius: 8,
                        color: '#F0F0F0',
                        fontSize: 16,
                        textAlign: 'center',
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="seg"
                      value={inp.duration}
                      onChange={(e) =>
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
                          duration: e.target.value,
                        })
                      }
                      style={{
                        width: 62,
                        padding: '7px 8px',
                        backgroundColor: '#1A1D22',
                        border: '1px solid #B5F23D',
                        borderRadius: 8,
                        color: '#F0F0F0',
                        fontSize: 16,
                        textAlign: 'center',
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleUpdateSet(setNum)}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: isPending ? 'rgba(181,242,61,0.4)' : '#B5F23D',
                      border: 'none',
                      borderRadius: 8,
                      color: '#0A0A0A',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPending ? '...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4B5563',
                      fontSize: 18,
                      lineHeight: 1,
                      padding: '4px',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentEx.type === 'strength' ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="kg"
                      value={inp.weight}
                      onChange={(e) =>
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
                          weight: e.target.value,
                        })
                      }
                      style={{
                        width: 62,
                        padding: '7px 8px',
                        backgroundColor: '#1A1D22',
                        border: '1px solid #2A2D34',
                        borderRadius: 8,
                        color: '#F0F0F0',
                        fontSize: 16,
                        textAlign: 'center',
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="seg"
                      value={inp.duration}
                      onChange={(e) =>
                        updateInput(currentEx.clientPlanDayExerciseId, setNum, {
                          duration: e.target.value,
                        })
                      }
                      style={{
                        width: 62,
                        padding: '7px 8px',
                        backgroundColor: '#1A1D22',
                        border: '1px solid #2A2D34',
                        borderRadius: 8,
                        color: '#F0F0F0',
                        fontSize: 16,
                        textAlign: 'center',
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleCompleteSet(setNum)}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#1F2227',
                      border: '1px solid #2A2D34',
                      borderRadius: 8,
                      color: '#9CA3AF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Completar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div
        style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid #1F2227',
          display: 'flex',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={isFirstExercise}
          style={{
            padding: '12px 14px',
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 12,
            color: isFirstExercise ? '#374151' : '#9CA3AF',
            cursor: isFirstExercise ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={16} />
          Ant.
        </button>

        {isLastExercise ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending || !allCurrentDone}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: allCurrentDone && !isPending ? '#B5F23D' : '#111317',
              border: `1px solid ${allCurrentDone ? '#B5F23D' : '#1F2227'}`,
              borderRadius: 12,
              color: allCurrentDone && !isPending ? '#0A0A0A' : '#374151',
              fontWeight: 700,
              fontSize: 14,
              cursor: allCurrentDone && !isPending ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? 'Guardando...' : '✓ Finalizar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={!allCurrentDone}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: '#111317',
              border: `1px solid ${allCurrentDone ? '#B5F23D' : '#1F2227'}`,
              borderRadius: 12,
              color: allCurrentDone ? '#B5F23D' : '#374151',
              fontWeight: 600,
              fontSize: 14,
              cursor: allCurrentDone ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        )}
      </div>

      {showVideo && currentEx.videoUrl && (
        <VideoModal url={currentEx.videoUrl} onClose={() => setShowVideo(false)} />
      )}
    </div>
  )
}
