'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logManualSessionAction } from '@/features/training/actions/log-manual-session'
import SessionCheckinModal from '@/components/ui/session-checkin-modal'
import type { LogSessionExercise } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', bg2: '#0F1014',
} as const

type SetState = {
  reps: string
  weight: string
  duration: string
}

type Props = {
  clientPlanDayId: string
  weekNumber: number
  exercises: LogSessionExercise[]
}

export default function LogSessionClient({ clientPlanDayId, weekNumber, exercises }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sets, setSets] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {}
    for (const ex of exercises) {
      initial[ex.clientPlanDayExerciseId] = Array.from({ length: ex.plannedSets }, () => ({
        reps: '', weight: '', duration: '',
      }))
    }
    return initial
  })
  const [error, setError] = useState<string | null>(null)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)

  function updateSet(exId: string, setIdx: number, field: keyof SetState, value: string) {
    setSets((prev) => {
      const copy = { ...prev }
      copy[exId] = (copy[exId] ?? []).map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return copy
    })
  }

  function handleSave() {
    startTransition(async () => {
      const setsData = exercises.flatMap((ex) =>
        (sets[ex.clientPlanDayExerciseId] ?? []).map((s, idx) => ({
          clientPlanDayExerciseId: ex.clientPlanDayExerciseId,
          setNumber: idx + 1,
          weightKg: ex.type === 'strength' && s.weight ? parseFloat(s.weight) : null,
          repsPerformed: ex.type === 'strength' && s.reps ? parseInt(s.reps) : null,
          durationSeconds: ex.type === 'cardio' && s.duration ? parseInt(s.duration) : null,
        }))
      )
      const result = await logManualSessionAction(clientPlanDayId, setsData)
      if ('error' in result) { setError(result.error); return }
      setSavedSessionId(result.sessionId)
      setShowCheckIn(true)
    })
  }

  if (showCheckIn && savedSessionId) {
    return (
      <SessionCheckinModal
        sessionId={savedSessionId}
        onComplete={() => router.push(`/client/history/week/${weekNumber}`)}
        onSkip={() => router.push(`/client/history/week/${weekNumber}`)}
      />
    )
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
                backgroundColor: T.bg2,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
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
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Reps</label>
                        <input
                          type="number" value={s.reps}
                          onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'reps', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Duración (seg)</label>
                      <input
                        type="number" value={s.duration}
                        onChange={(e) => updateSet(ex.clientPlanDayExerciseId, idx, 'duration', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
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
        onClick={handleSave}
        disabled={isPending}
        style={{
          padding: '14px 0', backgroundColor: T.lime, border: 'none',
          borderRadius: 12, color: '#0A0A0A', fontSize: 15, fontWeight: 700,
          cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Guardando...' : 'Guardar sesión'}
      </button>
    </div>
  )
}
