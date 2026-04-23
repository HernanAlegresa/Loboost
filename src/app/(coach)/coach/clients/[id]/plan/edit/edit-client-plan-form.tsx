'use client'

import { useActionState, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  updateClientPlanFullAction,
  type UpdateClientPlanFullState,
} from '@/features/plans/actions/update-client-plan-full'
import type { ClientPlanDayForEdit } from './page'
import type { ExercisePick } from '@/app/(coach)/coach/library/plans/queries'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import CustomSelect from '@/components/ui/custom-select'
import CoachSuccessOverlay from '@/components/ui/coach-success-overlay'

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
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
  textAlign: 'center',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

type ExerciseLine = {
  id: string
  dbId: string | null
  exerciseId: string
  sets: string
  repsMin: string
  repsMax: string
  restSeconds: string
}

type DayState = {
  clientPlanDayId: string
  dayOfWeek: number
  exercises: ExerciseLine[]
}

type WeekState = DayState[]

function buildInitialWeeks(weeks: number, days: ClientPlanDayForEdit[]): WeekState[] {
  const result: WeekState[] = Array.from({ length: weeks }, () => [])
  for (const day of days) {
    const weekIdx = day.weekNumber - 1
    if (weekIdx < 0 || weekIdx >= weeks) continue
    result[weekIdx]!.push({
      clientPlanDayId: day.id,
      dayOfWeek: day.dayOfWeek,
      exercises: day.exercises.map((e) => ({
        id: crypto.randomUUID(),
        dbId: e.id,
        exerciseId: e.exerciseId,
        sets: String(e.sets),
        repsMin: e.repsMin != null ? String(e.repsMin) : '',
        repsMax: e.repsMax != null ? String(e.repsMax) : '',
        restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
      })),
    })
  }
  for (const week of result) {
    week.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  }
  return result
}

function newLine(): ExerciseLine {
  return {
    id: crypto.randomUUID(),
    dbId: null,
    exerciseId: '',
    sets: '3',
    repsMin: '10',
    repsMax: '',
    restSeconds: '90',
  }
}

type Props = {
  clientId: string
  clientPlanId: string
  planName: string
  weeks: number
  days: ClientPlanDayForEdit[]
  exercises: ExercisePick[]
  readOnly?: boolean
}

export default function EditClientPlanForm({
  clientId,
  clientPlanId,
  planName,
  weeks,
  days,
  exercises,
  readOnly = false,
}: Props) {
  const router = useRouter()

  const [weekStates, setWeekStates] = useState<WeekState[]>(() =>
    buildInitialWeeks(weeks, days)
  )
  const [activeWeekIdx, setActiveWeekIdx] = useState(0)
  const [activeDayIdx, setActiveDayIdx] = useState(0)

  const activeDays = weekStates[activeWeekIdx] ?? []
  const activeDay = activeDays[activeDayIdx] ?? null

  useEffect(() => {
    setActiveDayIdx(0)
  }, [activeWeekIdx])

  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  )

  const planPayload = useMemo(() => {
    const allDays = weekStates.flat().map((day) => ({
      clientPlanDayId: day.clientPlanDayId,
      exercises: day.exercises
        .filter((e) => e.exerciseId)
        .map((e, idx) => {
          const ex = exerciseById.get(e.exerciseId)
          const isCardio = ex?.type === 'cardio'
          return {
            dbId: e.dbId,
            exerciseId: e.exerciseId,
            order: idx + 1,
            sets: Number(e.sets) || 3,
            repsMin: isCardio ? null : (e.repsMin.trim() ? Number(e.repsMin) : null),
            repsMax: isCardio ? null : (e.repsMax.trim() ? Number(e.repsMax) : null),
            restSeconds: e.restSeconds.trim() ? Number(e.restSeconds) : null,
          }
        }),
    }))
    return JSON.stringify({ clientPlanId, days: allDays })
  }, [weekStates, clientPlanId, exerciseById])

  const [state, formAction, isPending] = useActionState<UpdateClientPlanFullState, FormData>(
    updateClientPlanFullAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/coach/clients/${clientId}`)
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [state, router, clientId])

  function updateLine(dayIdx: number, lineId: string, patch: Partial<ExerciseLine>) {
    if (readOnly) return
    setWeekStates((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== activeWeekIdx) return w
        return w.map((d, di) => {
          if (di !== dayIdx) return d
          return {
            ...d,
            exercises: d.exercises.map((l) =>
              l.id === lineId ? { ...l, ...patch } : l
            ),
          }
        })
      })
      return next
    })
  }

  function addExercise(dayIdx: number) {
    if (readOnly) return
    setWeekStates((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== activeWeekIdx) return w
        return w.map((d, di) => {
          if (di !== dayIdx) return d
          return { ...d, exercises: [...d.exercises, newLine()] }
        })
      })
      return next
    })
  }

  function removeExercise(dayIdx: number, lineId: string) {
    if (readOnly) return
    setWeekStates((prev) => {
      const next = prev.map((w, wi) => {
        if (wi !== activeWeekIdx) return w
        return w.map((d, di) => {
          if (di !== dayIdx) return d
          return { ...d, exercises: d.exercises.filter((l) => l.id !== lineId) }
        })
      })
      return next
    })
  }

  function stepDay(delta: number) {
    if (activeDays.length === 0) return
    setActiveDayIdx((prev) => (prev + delta + activeDays.length) % activeDays.length)
  }

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
      {state?.success ? (
        <CoachSuccessOverlay
          title="¡Plan actualizado!"
          subtitle={planName}
          hint="Volviendo al perfil del cliente..."
        />
      ) : null}
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}`}
        title={readOnly ? 'Plan asignado' : 'Editar plan'}
        subtitle={planName}
        backColor="#B5F23D"
        titleSize={20}
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

          {/* Week tabs */}
          <div>
            <p style={sectionTitleStyle}>Semanas</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {Array.from({ length: weeks }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveWeekIdx(i)}
                  style={{
                    flexShrink: 0,
                    height: 36,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 20,
                    border: activeWeekIdx === i ? '1.5px solid #B5F23D' : '1px solid #2A2D34',
                    backgroundColor: activeWeekIdx === i ? 'rgba(181,242,61,0.1)' : '#111317',
                    color: activeWeekIdx === i ? '#B5F23D' : '#9CA3AF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Semana {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Day navigation */}
          {activeDays.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.45 }}>
              Esta semana no tiene días de entrenamiento configurados.
            </p>
          ) : (
            <div>
              <p style={sectionTitleStyle}>Días</p>

              {/* Day pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {activeDays.map((day, di) => (
                  <button
                    key={day.clientPlanDayId}
                    type="button"
                    onClick={() => setActiveDayIdx(di)}
                    style={{
                      height: 36,
                      paddingLeft: 14,
                      paddingRight: 14,
                      borderRadius: 9999,
                      border: `1.5px solid ${activeDayIdx === di ? '#B5F23D' : '#2A2D34'}`,
                      backgroundColor: activeDayIdx === di ? '#B5F23D' : 'transparent',
                      color: activeDayIdx === di ? '#0A0A0A' : '#6B7280',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {DAY_LABELS[day.dayOfWeek - 1]}
                  </button>
                ))}
              </div>

              {activeDay && (
                <div
                  style={{
                    backgroundColor: '#111317',
                    border: '1px solid #1F2227',
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  {/* Day navigator arrows */}
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
                      onClick={() => stepDay(-1)}
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
                        {DAY_LABELS[activeDay.dayOfWeek - 1]}
                      </p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
                        {activeDayIdx + 1} de {activeDays.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => stepDay(1)}
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

                  {/* Day dots */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
                    {activeDays.map((_, di) => (
                      <button
                        key={di}
                        type="button"
                        onClick={() => setActiveDayIdx(di)}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 9999,
                          border: 'none',
                          padding: 0,
                          backgroundColor: di === activeDayIdx ? '#B5F23D' : '#2A2D34',
                          cursor: 'pointer',
                        }}
                        aria-label={`Ir a día ${di + 1}`}
                      />
                    ))}
                  </div>

                  {/* Exercise list */}
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {activeDay.exercises.map((line, exerciseIndex) => {
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
                            <button
                              type="button"
                              onClick={() => removeExercise(activeDayIdx, line.id)}
                              aria-label={`Quitar ejercicio ${n}`}
                              disabled={readOnly}
                              style={{
                                flexShrink: 0,
                                background: 'rgba(242, 82, 82, 0.1)',
                                border: '1px solid rgba(242, 82, 82, 0.25)',
                                borderRadius: 10,
                                color: '#F25252',
                                cursor: readOnly ? 'not-allowed' : 'pointer',
                                opacity: readOnly ? 0.45 : 1,
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
                                required={!readOnly}
                                value={line.exerciseId}
                                onChange={(v) => updateLine(activeDayIdx, line.id, { exerciseId: v })}
                                placeholder="Seleccioná de tu biblioteca…"
                                disabled={readOnly}
                                options={exercises.map((ex) => ({
                                  value: ex.id,
                                  label: `${ex.name} (${ex.type === 'cardio' ? 'Cardio' : 'Fuerza'})`,
                                }))}
                              />
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: exType === 'cardio' ? '1fr' : '1fr 1fr 1fr',
                                gap: 10,
                              }}
                            >
                              <div>
                                <label style={{ ...labelStyle, marginBottom: 6 }}>Series</label>
                                <input
                                  value={line.sets}
                                  onChange={(e) =>
                                    updateLine(activeDayIdx, line.id, { sets: e.target.value })
                                  }
                                  inputMode="numeric"
                                  disabled={readOnly}
                                  style={inputStyle}
                                />
                              </div>
                              {exType !== 'cardio' && (
                                <>
                                  <div>
                                    <label style={{ ...labelStyle, marginBottom: 6 }}>Reps min</label>
                                    <input
                                      value={line.repsMin}
                                      onChange={(e) =>
                                        updateLine(activeDayIdx, line.id, { repsMin: e.target.value })
                                      }
                                      inputMode="numeric"
                                      placeholder="8"
                                    disabled={readOnly}
                                      style={inputStyle}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ ...labelStyle, marginBottom: 6 }}>Reps max</label>
                                    <input
                                      value={line.repsMax}
                                      onChange={(e) =>
                                        updateLine(activeDayIdx, line.id, { repsMax: e.target.value })
                                      }
                                      inputMode="numeric"
                                      placeholder="12"
                                    disabled={readOnly}
                                      style={inputStyle}
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <div>
                              <label style={{ ...labelStyle, marginBottom: 6 }}>
                                Descanso (seg, opcional)
                              </label>
                              <input
                                value={line.restSeconds}
                                onChange={(e) =>
                                  updateLine(activeDayIdx, line.id, { restSeconds: e.target.value })
                                }
                                inputMode="numeric"
                                disabled={readOnly}
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => addExercise(activeDayIdx)}
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
                  ) : null}
                </div>
              )}
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

          {!readOnly ? (
            <button
              type="submit"
              disabled={isPending}
              style={{
                alignSelf: 'center',
                width: 'fit-content',
                minWidth: 0,
                padding: '0 24px',
                height: 48,
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                color: '#0A0A0A',
                backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  )
}
