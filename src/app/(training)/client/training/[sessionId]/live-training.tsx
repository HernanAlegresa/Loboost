'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import type { LiveSessionData } from '@/features/training/types'

type SetInputs = { weight: string; duration: string }

function makeKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

export default function LiveTraining({ session }: { session: LiveSessionData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Initialize completed set keys from server data
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
      }
    }
    return s
  })

  // Per-set inputs initialized from server data
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

  function handleCompleteSet(
    exerciseId: string,
    setNumber: number,
    type: 'strength' | 'cardio'
  ) {
    const key = makeKey(exerciseId, setNumber)
    const inp = getInput(exerciseId, setNumber)

    // Optimistic update
    setLocalCompleted((prev) => new Set([...prev, key]))

    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', exerciseId)
      formData.set('setNumber', String(setNumber))
      if (type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
      if (type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)

      const result = await completeSetAction(formData)
      if (result.error) {
        // Revert on error
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
      router.push('/client/dashboard')
    })
  }

  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0)
  const allDone = localCompleted.size >= totalSets

  const completedExCount = session.exercises.filter((ex) =>
    Array.from({ length: ex.plannedSets }, (_, i) => i + 1).every((n) =>
      localCompleted.has(makeKey(ex.clientPlanDayExerciseId, n))
    )
  ).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
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
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
            Entrenamiento
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
            {completedExCount} / {session.exercises.length} ejercicios
          </p>
        </div>
      </div>

      {/* Scrollable exercises */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {session.exercises.map((ex) => {
          const setNumbers = Array.from({ length: ex.plannedSets }, (_, i) => i + 1)
          const exAllDone = setNumbers.every((n) =>
            localCompleted.has(makeKey(ex.clientPlanDayExerciseId, n))
          )

          return (
            <div
              key={ex.clientPlanDayExerciseId}
              style={{
                backgroundColor: '#111317',
                border: `1px solid ${exAllDone ? 'rgba(181,242,61,0.3)' : '#1F2227'}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Exercise header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1F2227',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: exAllDone ? '#B5F23D' : '#F0F0F0',
                    }}
                  >
                    {ex.name}
                  </p>
                  {ex.muscleGroup && (
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {ex.muscleGroup}
                    </p>
                  )}
                </div>
                {exAllDone && <CheckCircle size={18} color="#B5F23D" />}
              </div>

              {/* Sets */}
              <div
                style={{
                  padding: '10px 16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {setNumbers.map((setNum) => {
                  const key = makeKey(ex.clientPlanDayExerciseId, setNum)
                  const isDone = localCompleted.has(key)
                  const inp = getInput(ex.clientPlanDayExerciseId, setNum)

                  return (
                    <div
                      key={setNum}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          minWidth: 54,
                          flexShrink: 0,
                        }}
                      >
                        Serie {setNum}
                      </span>

                      {isDone ? (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                            {ex.type === 'strength'
                              ? `${inp.weight || '—'} kg × ${ex.plannedReps ?? '—'} reps`
                              : `${inp.duration || '—'} seg`}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: '#B5F23D',
                              marginLeft: 'auto',
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {ex.type === 'strength' ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="kg"
                              value={inp.weight}
                              onChange={(e) =>
                                updateInput(ex.clientPlanDayExerciseId, setNum, {
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
                                fontSize: 14,
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
                                updateInput(ex.clientPlanDayExerciseId, setNum, {
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
                                fontSize: 14,
                                textAlign: 'center',
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleCompleteSet(
                                ex.clientPlanDayExerciseId,
                                setNum,
                                ex.type
                              )
                            }
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
            </div>
          )
        })}

        {/* Finish button — appears when all sets are done */}
        {allDone && (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            style={{
              width: '100%',
              padding: 16,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 14,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {isPending ? 'Guardando...' : '✓ Finalizar entrenamiento'}
          </button>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
