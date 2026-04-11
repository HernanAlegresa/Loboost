'use client'

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  submitPlanBuilderAction,
  type PlanBuilderSubmitState,
} from '@/features/plans/actions/submit-plan-builder'
import type { ExercisePick, PlanBuilderInitial } from './queries'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import CustomSelect from '@/components/ui/custom-select'

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

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

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

function emptyDays(): Record<number, DayDraft> {
  const init: Record<number, DayDraft> = {}
  for (let dow = 1; dow <= 7; dow++) {
    init[dow] = { enabled: false, exercises: [] }
  }
  return init
}

function daysFromInitial(initial: PlanBuilderInitial): Record<number, DayDraft> {
  const d = emptyDays()
  for (const day of initial.days) {
    d[day.dayOfWeek] = {
      enabled: true,
      exercises: day.exercises.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        sets: String(e.sets),
        reps: e.reps != null ? String(e.reps) : '10',
        durationSeconds: e.durationSeconds != null ? String(e.durationSeconds) : '600',
        restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
      })),
    }
  }
  return d
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

type Props = {
  exercises: ExercisePick[]
  mode: 'create' | 'edit'
  initialPlan?: PlanBuilderInitial
}

export default function PlanBuilderForm({ exercises, mode, initialPlan }: Props) {
  const router = useRouter()
  const [name, setName] = useState(() => initialPlan?.name ?? '')
  const [description, setDescription] = useState(() => initialPlan?.description?.trim() ?? '')
  const [weeks, setWeeks] = useState(() => String(initialPlan?.weeks ?? 4))

  const [days, setDays] = useState<Record<number, DayDraft>>(() =>
    initialPlan ? daysFromInitial(initialPlan) : emptyDays()
  )

  const [activeDow, setActiveDow] = useState<number | null>(() => {
    if (!initialPlan?.days.length) return null
    const sorted = [...initialPlan.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    return sorted[0]?.dayOfWeek ?? null
  })

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const enabledSorted = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 7]
    return order.filter((d) => days[d]?.enabled)
  }, [days])

  useEffect(() => {
    if (enabledSorted.length === 0) {
      setActiveDow(null)
      return
    }
    if (activeDow === null || !days[activeDow]?.enabled) {
      setActiveDow(enabledSorted[0])
    }
  }, [days, activeDow, enabledSorted])

  const [state, formAction, isPending] = useActionState<PlanBuilderSubmitState, FormData>(
    submitPlanBuilderAction,
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
    if (!state?.success) return
    if (mode === 'edit' && initialPlan) {
      router.push(`/coach/library/plans/${initialPlan.planId}`)
      return
    }
    router.push('/coach/library/plans')
  }, [state, router, mode, initialPlan])

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

  function stepActive(delta: number) {
    if (enabledSorted.length === 0 || activeDow === null) return
    const idx = enabledSorted.indexOf(activeDow)
    if (idx < 0) return
    const next = enabledSorted[(idx + delta + enabledSorted.length) % enabledSorted.length]
    setActiveDow(next)
  }

  const activeIdx = activeDow !== null ? enabledSorted.indexOf(activeDow) : -1
  const draft = activeDow !== null ? days[activeDow] : null

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CoachSubpageHeader
        backHref="/coach/library/plans"
        title={mode === 'edit' ? 'Editar plan' : 'Nuevo plan'}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
        }}
      >
        <form
          action={formAction}
          style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <input type="hidden" name="planPayload" value={planPayload} readOnly />
          <input type="hidden" name="builderMode" value={mode} readOnly />
          {mode === 'edit' && initialPlan ? (
            <input type="hidden" name="planId" value={initialPlan.planId} readOnly />
          ) : null}

          <div>
            <p style={sectionTitleStyle}>Datos del plan</p>
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
            <p style={sectionTitleStyle}>Días de entrenamiento</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: -8, marginBottom: 12, lineHeight: 1.5 }}>
              Activá los días. Editá un día a la vez para mantener el formulario ordenado.
            </p>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {DAY_LABELS.map((lbl, idx) => {
                const dow = idx + 1
                const on = days[dow]?.enabled
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    style={{
                      flex: '1 0 12%',
                      minWidth: 36,
                      height: 36,
                      borderRadius: 9999,
                      border: `1.5px solid ${on ? '#B5F23D' : '#2A2D34'}`,
                      backgroundColor: on ? '#B5F23D' : 'transparent',
                      color: on ? '#0A0A0A' : '#6B7280',
                      fontSize: 11,
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

            {enabledSorted.length > 0 && activeDow !== null && draft?.enabled ? (
              <div
                style={{
                  marginTop: 16,
                  backgroundColor: '#111317',
                  border: '1px solid #1F2227',
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => stepActive(-1)}
                    aria-label="Día anterior"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid #2A2D34',
                      background: '#0A0A0A',
                      color: '#B5F23D',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
                      {DAY_LABELS[activeDow - 1]}
                    </p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
                      {activeIdx + 1} de {enabledSorted.length} · Tocá los puntos o las flechas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => stepActive(1)}
                    aria-label="Día siguiente"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid #2A2D34',
                      background: '#0A0A0A',
                      color: '#B5F23D',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {enabledSorted.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setActiveDow(d)}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 9999,
                        border: 'none',
                        padding: 0,
                        backgroundColor: d === activeDow ? '#B5F23D' : '#2A2D34',
                        cursor: 'pointer',
                      }}
                      aria-label={`Ir a ${DAY_LABELS[d - 1]}`}
                      aria-current={d === activeDow ? 'step' : undefined}
                    />
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#6B7280',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: '0 0 12px',
                    }}
                  >
                    Ejercicios del día
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '-8px 0 14px', lineHeight: 1.45 }}>
                    Orden de ejecución: el primero es el que va arriba en la lista.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {draft.exercises.map((line, exerciseIndex) => {
                      const exType = exerciseById.get(line.exerciseId)?.type
                      const n = exerciseIndex + 1
                      return (
                        <div
                          key={line.id}
                          style={{
                            backgroundColor: '#0D0F12',
                            border: '1px solid #252830',
                            borderRadius: 14,
                            borderLeft: '3px solid #B5F23D',
                            padding: '14px 14px 16px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              marginBottom: 14,
                              paddingBottom: 12,
                              borderBottom: '1px solid #1A1D22',
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: '#B5F23D',
                                  letterSpacing: '0.14em',
                                  textTransform: 'uppercase',
                                  margin: 0,
                                }}
                              >
                                Ejercicio {n}
                              </p>
                              <p style={{ fontSize: 11, color: '#5C6370', margin: '4px 0 0' }}>
                                {n === 1 ? 'Primero del día' : `Después del ejercicio ${n - 1}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExercise(activeDow, line.id)}
                              aria-label={`Quitar ejercicio ${n}`}
                              style={{
                                flexShrink: 0,
                                background: 'rgba(242, 82, 82, 0.1)',
                                border: '1px solid rgba(242, 82, 82, 0.25)',
                                borderRadius: 10,
                                color: '#F25252',
                                cursor: 'pointer',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <label style={{ ...labelStyle, marginBottom: 6 }}>Movimiento</label>
                              <CustomSelect
                                key={`${line.id}-${line.exerciseId}`}
                                required
                                value={line.exerciseId}
                                onChange={(v) => updateLine(activeDow, line.id, { exerciseId: v })}
                                placeholder="Seleccioná de tu biblioteca…"
                                options={exercises.map((ex) => ({
                                  value: ex.id,
                                  label: `${ex.name} (${ex.type === 'cardio' ? 'Cardio' : 'Fuerza'})`,
                                }))}
                              />
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                              }}
                            >
                              <div>
                                <label style={{ ...labelStyle, marginBottom: 6 }}>Series</label>
                                <input
                                  value={line.sets}
                                  onChange={(e) =>
                                    updateLine(activeDow, line.id, { sets: e.target.value })
                                  }
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
                                      updateLine(activeDow, line.id, {
                                        durationSeconds: e.target.value,
                                      })
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
                                    onChange={(e) =>
                                      updateLine(activeDow, line.id, { reps: e.target.value })
                                    }
                                    inputMode="numeric"
                                    style={inputStyle}
                                  />
                                </div>
                              )}
                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ ...labelStyle, marginBottom: 6 }}>
                                  Descanso (seg, opcional)
                                </label>
                                <input
                                  value={line.restSeconds}
                                  onChange={(e) =>
                                    updateLine(activeDow, line.id, { restSeconds: e.target.value })
                                  }
                                  inputMode="numeric"
                                  style={inputStyle}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => addExercise(activeDow)}
                    style={{
                      width: '100%',
                      marginTop: 16,
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 12,
                      border: '1px dashed #3D4A2E',
                      backgroundColor: 'rgba(181, 242, 61, 0.06)',
                      color: '#B5F23D',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={20} strokeWidth={2.5} />
                    Agregar ejercicio
                  </button>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#5C6370',
                      textAlign: 'center',
                      margin: '8px 0 0',
                      lineHeight: 1.4,
                    }}
                  >
                    Siempre podés sumar otro bloque acá, sin volver arriba.
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 14, lineHeight: 1.45 }}>
                Activá al menos un día arriba para armar la rutina.
              </p>
            )}
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
            {isPending ? 'Guardando...' : mode === 'edit' ? 'Guardar plan' : 'Crear plan'}
          </button>
        </form>
      </div>
    </div>
  )
}
