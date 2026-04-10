'use client'

import { useActionState, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { createPlanAction, type CreatePlanState } from '@/features/plans/actions/create-plan'
import type { ExercisePick } from '../queries'

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#111317',
  border: '1px solid #2A2D34',
  borderRadius: 10,
  padding: '0 14px',
  color: '#F0F0F0',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

type ExerciseLine = {
  id: string
  exerciseId: string
  sets: string
  reps: string
  durationSeconds: string
  restSeconds: string
}

type DayDraft = {
  enabled: boolean
  exercises: ExerciseLine[]
}

function newLine(): ExerciseLine {
  return {
    id: crypto.randomUUID(),
    exerciseId: '',
    sets: '3',
    reps: '10',
    durationSeconds: '600',
    restSeconds: '90',
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function CreatePlanForm({ exercises }: { exercises: ExercisePick[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [weeks, setWeeks] = useState('4')

  const [days, setDays] = useState<Record<number, DayDraft>>(() => {
    const init: Record<number, DayDraft> = {}
    for (let dow = 1; dow <= 7; dow++) {
      init[dow] = { enabled: false, exercises: [] }
    }
    return init
  })

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const [state, formAction, isPending] = useActionState<CreatePlanState, FormData>(
    createPlanAction,
    null
  )

  const planPayload = useMemo(() => {
    const enabledDays = Object.entries(days)
      .map(([dow, draft]) => ({ dow: Number(dow), draft }))
      .filter((x) => x.draft.enabled)
      .sort((a, b) => a.dow - b.dow)

    const payloadDays = enabledDays.map(({ dow, draft }) => {
      const lines = draft.exercises.map((line, idx) => {
        const ex = exerciseById.get(line.exerciseId)
        const base = {
          exerciseId: line.exerciseId,
          order: idx + 1,
          sets: Number(line.sets),
          reps: undefined as number | undefined,
          durationSeconds: undefined as number | undefined,
          restSeconds: line.restSeconds.trim() === '' ? undefined : Number(line.restSeconds),
        }
        if (ex?.type === 'cardio') {
          base.reps = undefined
          base.durationSeconds = Number(line.durationSeconds)
        } else {
          base.reps = Number(line.reps)
          base.durationSeconds = undefined
        }
        return base
      })

      return { dayOfWeek: dow, exercises: lines }
    })

    return JSON.stringify({
      name: name.trim(),
      description: description.trim() === '' ? undefined : description.trim(),
      weeks: Number(weeks),
      days: payloadDays,
    })
  }, [days, description, exerciseById, name, weeks])

  useEffect(() => {
    if (state?.success) {
      router.push('/coach/library/plans')
    }
  }, [state, router])

  function toggleDay(dow: number) {
    setDays((prev) => {
      const cur = prev[dow]
      const nextEnabled = !cur.enabled
      return {
        ...prev,
        [dow]: {
          enabled: nextEnabled,
          exercises: nextEnabled && cur.exercises.length === 0 ? [newLine()] : cur.exercises,
        },
      }
    })
  }

  function addExercise(dow: number) {
    setDays((prev) => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        exercises: [...prev[dow].exercises, newLine()],
      },
    }))
  }

  function removeExercise(dow: number, lineId: string) {
    setDays((prev) => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        exercises: prev[dow].exercises.filter((l) => l.id !== lineId),
      },
    }))
  }

  function updateLine(dow: number, lineId: string, patch: Partial<ExerciseLine>) {
    setDays((prev) => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        exercises: prev[dow].exercises.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
      },
    }))
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 20px 24px',
          position: 'sticky',
          top: 0,
          backgroundColor: '#0A0A0A',
          zIndex: 10,
        }}
      >
        <Link
          href="/coach/library/plans"
          style={{ display: 'flex', alignItems: 'center', color: '#6B7280', textDecoration: 'none' }}
        >
          <ChevronLeft size={22} />
        </Link>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>Nueva plantilla</span>
      </div>

      <form action={formAction} style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <input type="hidden" name="planPayload" value={planPayload} readOnly />

        <div>
          <p style={sectionTitleStyle}>Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre">
              <input
                name="nameDisplay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                required
                style={inputStyle}
                placeholder="Fuerza 4 semanas"
                autoComplete="off"
              />
            </Field>

            <Field label="Descripción (opcional)">
              <input
                name="descriptionDisplay"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                type="text"
                style={inputStyle}
                placeholder="Objetivo, enfoque, notas…"
                autoComplete="off"
              />
            </Field>

            <Field label="Semanas (1–12)">
              <input
                name="weeksDisplay"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                type="number"
                min={1}
                max={12}
                required
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        <div>
          <p style={sectionTitleStyle}>Días (se repiten todas las semanas)</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: -8, marginBottom: 12, lineHeight: 1.5 }}>
            Elegí qué días entrena el cliente. En cada día agregá ejercicios desde tu biblioteca.
          </p>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {DAY_LABELS.map((lbl, idx) => {
              const dow = idx + 1
              const on = days[dow]?.enabled
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 9999,
                    border: `1.5px solid ${on ? '#B5F23D' : '#2A2D34'}`,
                    backgroundColor: on ? '#B5F23D' : 'transparent',
                    color: on ? '#0A0A0A' : '#6B7280',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  aria-pressed={on}
                >
                  {lbl}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
              const draft = days[dow]
              if (!draft?.enabled) return null
              return (
                <div
                  key={dow}
                  style={{
                    backgroundColor: '#111317',
                    border: '1px solid #1F2227',
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F0' }}>
                      Día {dow} ({DAY_LABELS[dow - 1]})
                    </p>
                    <button
                      type="button"
                      onClick={() => addExercise(dow)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid #2A2D34',
                        background: 'transparent',
                        color: '#B5F23D',
                        borderRadius: 10,
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <Plus size={16} />
                      Ejercicio
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {draft.exercises.map((line) => {
                      const exType = exerciseById.get(line.exerciseId)?.type
                      return (
                        <div
                          key={line.id}
                          style={{
                            borderTop: '1px solid #1A1D22',
                            paddingTop: 12,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <label style={{ ...labelStyle, marginBottom: 6 }}>Ejercicio</label>
                              <select
                                value={line.exerciseId}
                                onChange={(e) => updateLine(dow, line.id, { exerciseId: e.target.value })}
                                required
                                style={{
                                  ...inputStyle,
                                  appearance: 'none',
                                  backgroundImage: 'none',
                                }}
                              >
                                <option value="">Seleccioná…</option>
                                {exercises.map((ex) => (
                                  <option key={ex.id} value={ex.id}>
                                    {ex.name} ({ex.type === 'cardio' ? 'Cardio' : 'Fuerza'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExercise(dow, line.id)}
                              aria-label="Quitar ejercicio"
                              style={{
                                marginTop: 26,
                                background: 'none',
                                border: 'none',
                                color: '#6B7280',
                                cursor: 'pointer',
                                padding: 6,
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 10,
                            }}
                          >
                            <div>
                              <label style={{ ...labelStyle, marginBottom: 6 }}>Series</label>
                              <input
                                value={line.sets}
                                onChange={(e) => updateLine(dow, line.id, { sets: e.target.value })}
                                inputMode="numeric"
                                style={inputStyle}
                              />
                            </div>
                            {exType === 'cardio' ? (
                              <div>
                                <label style={{ ...labelStyle, marginBottom: 6 }}>Duración (seg)</label>
                                <input
                                  value={line.durationSeconds}
                                  onChange={(e) =>
                                    updateLine(dow, line.id, { durationSeconds: e.target.value })
                                  }
                                  inputMode="numeric"
                                  style={inputStyle}
                                />
                              </div>
                            ) : (
                              <div>
                                <label style={{ ...labelStyle, marginBottom: 6 }}>Reps</label>
                                <input
                                  value={line.reps}
                                  onChange={(e) => updateLine(dow, line.id, { reps: e.target.value })}
                                  inputMode="numeric"
                                  style={inputStyle}
                                />
                              </div>
                            )}
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ ...labelStyle, marginBottom: 6 }}>Descanso (seg, opcional)</label>
                              <input
                                value={line.restSeconds}
                                onChange={(e) => updateLine(dow, line.id, { restSeconds: e.target.value })}
                                inputMode="numeric"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {exercises.length === 0 && (
          <div
            role="status"
            style={{
              backgroundColor: 'rgba(242, 153, 74, 0.08)',
              border: '1px solid rgba(242, 153, 74, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#F2994A', lineHeight: 1.45 }}>
              Primero necesitás ejercicios en tu biblioteca. Creá al menos uno en{' '}
              <Link href="/coach/library/exercises/new" style={{ color: '#B5F23D' }}>
                Ejercicios
              </Link>
              .
            </p>
          </div>
        )}

        {state && !state.success && 'error' in state && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(242, 82, 82, 0.08)',
              border: '1px solid rgba(242, 82, 82, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || exercises.length === 0}
          style={{
            height: 48,
            borderRadius: 12,
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: '#0A0A0A',
            backgroundColor: isPending || exercises.length === 0 ? '#8BA82B' : '#B5F23D',
            cursor: isPending || exercises.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Crear plantilla'}
        </button>
      </form>
    </div>
  )
}
