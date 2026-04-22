'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startSessionAction } from '@/features/training/actions/start-session'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import type { LogSessionExercise } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', bg2: '#0F1014',
} as const

type SetState = {
  reps: string
  weight: string
  duration: string
  completed: boolean
}

type Props = {
  clientPlanDayId: string
  weekNumber: number
  initialSessionId: string | null
  exercises: LogSessionExercise[]
}

export default function LogSessionClient({ clientPlanDayId, weekNumber, initialSessionId, exercises }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [sets, setSets] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {}
    for (const ex of exercises) {
      initial[ex.clientPlanDayExerciseId] = Array.from({ length: ex.plannedSets }, () => ({
        reps: '', weight: '', duration: '', completed: false,
      }))
    }
    return initial
  })
  const [error, setError] = useState<string | null>(null)

  function updateSet(exId: string, setIdx: number, field: keyof SetState, value: string | boolean) {
    setSets((prev) => {
      const copy = { ...prev }
      copy[exId] = copy[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return copy
    })
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId
    const fd = new FormData()
    fd.set('clientPlanDayId', clientPlanDayId)
    const result = await startSessionAction(fd)
    if ('error' in result) { setError(result.error ?? 'Error al iniciar sesión'); return null }
    setSessionId(result.sessionId ?? null)
    return result.sessionId ?? null
  }

  async function markSetComplete(exId: string, setIdx: number, ex: LogSessionExercise) {
    const sid = await ensureSession()
    if (!sid) return

    const s = sets[exId][setIdx]
    const fd = new FormData()
    fd.set('sessionId', sid)
    fd.set('clientPlanDayExerciseId', exId)
    fd.set('setNumber', String(setIdx + 1))
    if (ex.type === 'strength') {
      if (s.reps) fd.set('repsPerformed', s.reps)
      if (s.weight) fd.set('weightKg', s.weight)
    } else {
      if (s.duration) fd.set('durationSeconds', s.duration)
    }

    const result = await completeSetAction(fd)
    if ('error' in result) { setError(result.error ?? 'Error al registrar serie'); return }
    updateSet(exId, setIdx, 'completed', true)
    setError(null)
  }

  function handleFinish() {
    startTransition(async () => {
      const sid = await ensureSession()
      if (!sid) return
      const result = await completeSessionAction(sid)
      if ('error' in result) { setError(result.error ?? 'Error al finalizar sesión'); return }
      router.push(`/client/history/week/${weekNumber}`)
      router.refresh()
    })
  }

  const inputStyle = {
    padding: '8px 10px', backgroundColor: T.bg2,
    border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.text, fontSize: 13, width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {exercises.map((ex) => (
        <div key={ex.clientPlanDayExerciseId} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{ex.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
              {ex.plannedSets} series
              {ex.type === 'strength' && ex.plannedRepsMin != null
                ? ` · ${ex.plannedRepsMin}${ex.plannedRepsMax && ex.plannedRepsMax !== ex.plannedRepsMin ? `–${ex.plannedRepsMax}` : ''} reps`
                : ex.type === 'cardio' && ex.plannedDurationSeconds != null
                  ? ` · ${ex.plannedDurationSeconds}s`
                  : ''}
            </p>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(sets[ex.clientPlanDayExerciseId] ?? []).map((s, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                backgroundColor: s.completed ? 'rgba(181,242,61,0.06)' : T.bg2,
                borderRadius: 10,
                border: `1px solid ${s.completed ? 'rgba(181,242,61,0.2)' : T.border}`,
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: T.muted }}>Serie {idx + 1}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {ex.type === 'strength' ? (
                    <>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Peso (kg)</label>
                        <input
                          type="number" step="0.5" value={s.weight}
                          onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'weight', e.target.value)}
                          style={inputStyle} disabled={s.completed}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Reps</label>
                        <input
                          type="number" value={s.reps}
                          onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'reps', e.target.value)}
                          style={inputStyle} disabled={s.completed}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Duración (seg)</label>
                      <input
                        type="number" value={s.duration}
                        onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'duration', e.target.value)}
                        style={inputStyle} disabled={s.completed}
                      />
                    </div>
                  )}
                  {!s.completed ? (
                    <button
                      type="button"
                      onClick={() => markSetComplete(ex.clientPlanDayExerciseId, idx, ex)}
                      style={{
                        padding: '8px 12px', backgroundColor: T.lime, border: 'none',
                        borderRadius: 8, color: '#0A0A0A', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ✓ Listo
                    </button>
                  ) : (
                    <span style={{ fontSize: 16, color: T.lime }}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 13, color: '#F25252', textAlign: 'center' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleFinish}
        disabled={isPending}
        style={{
          padding: '14px 0', backgroundColor: T.lime, border: 'none',
          borderRadius: 12, color: '#0A0A0A', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Guardando...' : 'Finalizar sesión'}
      </button>
    </div>
  )
}
