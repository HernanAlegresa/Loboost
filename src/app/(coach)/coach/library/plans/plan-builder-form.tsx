'use client'

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  submitPlanBuilderAction,
  type PlanBuilderSubmitState,
} from '@/features/plans/actions/submit-plan-builder'
import type { ExercisePick, PlanBuilderInitial } from './queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import CustomSelect from '@/components/ui/custom-select'
import CoachSuccessOverlay from '@/components/ui/coach-success-overlay'

const FORM_ID = 'plan-builder-form'

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

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
const DAY_FULL_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

type ExerciseLine = {
  id: string
  exerciseId: string
  sets: string
  repsMin: string
  repsMax: string
  durationSeconds: string
  restSeconds: string
}

type DayDraft = {
  enabled: boolean
  exercises: ExerciseLine[]
}

type WeekDraft = {
  weekType: 'normal' | 'deload' | 'peak' | 'test'
  days: Record<number, DayDraft>
}

type PendingAction =
  | { type: 'toggleDay'; weekIdx: number; dow: number; message: string }
  | { type: 'reduceWeeks'; newWeeks: number; message: string }

function emptyDays(): Record<number, DayDraft> {
  const init: Record<number, DayDraft> = {}
  for (let dow = 1; dow <= 7; dow++) {
    init[dow] = { enabled: false, exercises: [] }
  }
  return init
}

function emptyWeekDraft(): WeekDraft {
  return { weekType: 'normal', days: emptyDays() }
}

function initialWeekDrafts(weeks: number, initial?: PlanBuilderInitial): WeekDraft[] {
  if (initial) return daysFromInitial(initial)
  return Array.from({ length: weeks }, () => emptyWeekDraft())
}

function daysFromInitial(initial: PlanBuilderInitial): WeekDraft[] {
  return initial.planWeeks.map((week) => {
    const days = emptyDays()
    for (const day of week.days) {
      days[day.dayOfWeek] = {
        enabled: true,
        exercises: day.exercises.map((e) => ({
          id: crypto.randomUUID(),
          exerciseId: e.exerciseId,
          sets: String(e.sets),
          repsMin: e.repsMin != null ? String(e.repsMin) : '10',
          repsMax: e.repsMax != null ? String(e.repsMax) : '',
          durationSeconds: e.durationSeconds != null ? String(e.durationSeconds) : '600',
          restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
        })),
      }
    }
    return {
      weekType: (week.weekType as WeekDraft['weekType']) ?? 'normal',
      days,
    }
  })
}

function newLine(): ExerciseLine {
  return {
    id: crypto.randomUUID(),
    exerciseId: '',
    sets: '3',
    repsMin: '10',
    repsMax: '',
    durationSeconds: '600',
    restSeconds: '90',
  }
}

function buildCollapsedSummary(line: ExerciseLine, isCardio: boolean): string {
  const parts: string[] = []
  if (line.sets) parts.push(`${line.sets} series`)
  if (isCardio) {
    const dur = Number(line.durationSeconds)
    if (dur > 0) {
      const mins = Math.round(dur / 60)
      parts.push(mins > 0 ? `${mins}min` : `${dur}s`)
    }
  } else {
    if (line.repsMin && line.repsMax) parts.push(`${line.repsMin}–${line.repsMax} reps`)
    else if (line.repsMin) parts.push(`${line.repsMin} reps`)
    if (line.restSeconds) parts.push(`${line.restSeconds}s rest`)
  }
  return parts.join(' · ')
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

type SortableExerciseCardProps = {
  line: ExerciseLine
  exerciseIndex: number
  isExpanded: boolean
  exerciseName: string | null
  isCardio: boolean
  exercises: ExercisePick[]
  onToggleExpand: () => void
  onRemove: () => void
  onUpdateLine: (patch: Partial<ExerciseLine>) => void
}

function SortableExerciseCard({
  line,
  exerciseIndex,
  isExpanded,
  exerciseName,
  isCardio,
  exercises,
  onToggleExpand,
  onRemove,
  onUpdateLine,
}: SortableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.id,
  })

  const n = exerciseIndex + 1

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
        backgroundColor: '#0D0F12',
        border: `1px solid ${isExpanded ? '#2A3020' : '#252830'}`,
        borderRadius: 14,
        borderLeft: '3px solid #B5F23D',
        overflow: 'hidden',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isExpanded ? '12px 14px 0' : '12px 14px',
        }}
      >
        <span
          {...attributes}
          {...listeners}
          style={{
            fontSize: 17,
            color: '#3D4A50',
            cursor: isDragging ? 'grabbing' : 'grab',
            lineHeight: 1,
            userSelect: 'none',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          ≡
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#B5F23D',
            letterSpacing: '0.1em',
            flexShrink: 0,
            minWidth: 14,
            textAlign: 'center',
          }}
        >
          {n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#F0F0F0',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {exerciseName ?? `Ejercicio ${n}`}
          </p>
          {!isExpanded && (
            <p
              style={{
                fontSize: 11,
                color: '#6B7280',
                margin: '2px 0 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {buildCollapsedSummary(line, isCardio)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? `Colapsar ejercicio ${n}` : `Expandir ejercicio ${n}`}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: '4px 6px',
            cursor: 'pointer',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
        </button>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ height: 1, backgroundColor: '#1A1D22', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Quitar ejercicio ${n}`}
              style={{
                background: 'rgba(242, 82, 82, 0.1)',
                border: '1px solid rgba(242, 82, 82, 0.25)',
                borderRadius: 10,
                color: '#F25252',
                cursor: 'pointer',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 6 }}>Movimiento</label>
              <CustomSelect
                key={`${line.id}-${line.exerciseId}`}
                required
                value={line.exerciseId}
                onChange={(v) => onUpdateLine({ exerciseId: v })}
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
                gridTemplateColumns: isCardio ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Series</label>
                <input
                  value={line.sets}
                  onChange={(e) => onUpdateLine({ sets: e.target.value })}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
              {isCardio ? (
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>Duración (seg)</label>
                  <input
                    value={line.durationSeconds}
                    onChange={(e) => onUpdateLine({ durationSeconds: e.target.value })}
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>Reps min</label>
                    <input
                      value={line.repsMin}
                      onChange={(e) => onUpdateLine({ repsMin: e.target.value })}
                      inputMode="numeric"
                      placeholder="8"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>Reps max</label>
                    <input
                      value={line.repsMax}
                      onChange={(e) => onUpdateLine({ repsMax: e.target.value })}
                      inputMode="numeric"
                      placeholder="12"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, marginBottom: 6 }}>
                  Descanso (seg, opcional)
                </label>
                <input
                  value={line.restSeconds}
                  onChange={(e) => onUpdateLine({ restSeconds: e.target.value })}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type Props = {
  exercises: ExercisePick[]
  mode: 'create' | 'edit'
  initialPlan?: PlanBuilderInitial
}

type BuilderStage = 'stage1' | 'stage2'

export default function PlanBuilderForm({ exercises, mode, initialPlan }: Props) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState(() => initialPlan?.name ?? '')
  const [description, setDescription] = useState(() => initialPlan?.description?.trim() ?? '')
  const [activeStage, setActiveStage] = useState<BuilderStage>('stage1')
  const [stage2View, setStage2View] = useState<'dayMap' | 'dayEditor'>('dayMap')

  const [weekDrafts, setWeekDrafts] = useState<WeekDraft[]>(() =>
    initialWeekDrafts(initialPlan?.weeks ?? 4, initialPlan)
  )
  const [activeWeekIdx, setActiveWeekIdx] = useState(0)

  const activeDays = weekDrafts[activeWeekIdx]?.days ?? emptyDays()

  const [activeDow, setActiveDow] = useState<number | null>(() => {
    if (!initialPlan?.planWeeks?.[0]?.days?.length) return null
    const sorted = [...(initialPlan.planWeeks[0]?.days ?? [])].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek
    )
    return sorted[0]?.dayOfWeek ?? null
  })

  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  function reorderExercises(dow: number, oldIdx: number, newIdx: number) {
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[activeWeekIdx]!
      const reordered = arrayMove(w.days[dow]!.exercises, oldIdx, newIdx)
      next[activeWeekIdx] = {
        ...w,
        days: { ...w.days, [dow]: { ...w.days[dow]!, exercises: reordered } },
      }
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent, dow: number) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const exs = activeDays[dow]?.exercises ?? []
    const oldIdx = exs.findIndex((e) => e.id === active.id)
    const newIdx = exs.findIndex((e) => e.id === over.id)
    if (oldIdx !== -1 && newIdx !== -1) reorderExercises(dow, oldIdx, newIdx)
  }

  const enabledSorted = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 7]
    return order.filter((d) => activeDays[d]?.enabled)
  }, [activeDays])

  useEffect(() => {
    if (enabledSorted.length === 0) {
      setActiveDow(null)
      return
    }
    if (activeDow === null || !activeDays[activeDow]?.enabled) {
      setActiveDow(enabledSorted[0])
    }
  }, [activeDays, activeDow, enabledSorted])

  const [state, formAction, isPending] = useActionState<PlanBuilderSubmitState, FormData>(
    submitPlanBuilderAction,
    null
  )

  const planPayload = useMemo(() => {
    return JSON.stringify({
      name: name.trim(),
      description: description.trim() === '' ? undefined : description.trim(),
      weeks: weekDrafts.length,
      planWeeks: weekDrafts.map((w, i) => ({
        weekNumber: i + 1,
        weekType: w.weekType,
        days: Object.entries(w.days)
          .filter(([, d]) => d.enabled && d.exercises.length > 0)
          .map(([dow, d]) => ({
            dayOfWeek: Number(dow),
            exercises: d.exercises
              .filter((e) => e.exerciseId)
              .map((e, idx) => {
                const ex = exerciseById.get(e.exerciseId)
                const isCardio = ex?.type === 'cardio'
                return {
                  exerciseId: e.exerciseId,
                  order: idx + 1,
                  sets: Number(e.sets) || 3,
                  repsMin: isCardio ? undefined : (e.repsMin.trim() ? Number(e.repsMin) : undefined),
                  repsMax: isCardio ? undefined : (e.repsMax.trim() ? Number(e.repsMax) : undefined),
                  durationSeconds: isCardio ? Number(e.durationSeconds) : undefined,
                  restSeconds: e.restSeconds.trim() === '' ? undefined : Number(e.restSeconds),
                }
              }),
          })),
      })),
    })
  }, [weekDrafts, name, description, exerciseById])

  useEffect(() => {
    if (!state?.success) return
    const timer = setTimeout(() => {
      if (mode === 'edit' && initialPlan) {
        router.push(`/coach/library/plans/${initialPlan.planId}`)
        return
      }
      router.push('/coach/library?tab=plans')
    }, 2200)
    return () => clearTimeout(timer)
  }, [state, router, mode, initialPlan])

  function applyWeeksChange(newWeeks: number) {
    setWeekDrafts((prev) => {
      if (newWeeks > prev.length) {
        const added = Array.from({ length: newWeeks - prev.length }, () => emptyWeekDraft())
        return [...prev, ...added]
      }
      return prev.slice(0, newWeeks)
    })
    if (activeWeekIdx >= newWeeks) setActiveWeekIdx(newWeeks - 1)
  }

  function handleWeeksChange(newWeeks: number) {
    if (newWeeks < weekDrafts.length) {
      const affectedNums: number[] = []
      weekDrafts.slice(newWeeks).forEach((w, i) => {
        if (Object.values(w.days).some((d) => d.exercises.some((e) => e.exerciseId !== ''))) {
          affectedNums.push(newWeeks + i + 1)
        }
      })
      if (affectedNums.length > 0) {
        const label =
          affectedNums.length === 1
            ? `la Semana ${affectedNums[0]}`
            : `las semanas ${affectedNums.join(', ')}`
        setPendingAction({
          type: 'reduceWeeks',
          newWeeks,
          message: `Los ejercicios de ${label} se perderán al reducir el plan.`,
        })
        return
      }
    }
    applyWeeksChange(newWeeks)
  }

  function toggleDay(weekIdx: number, dow: number) {
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[weekIdx]!
      const cur = w.days[dow]!
      const nextEnabled = !cur.enabled
      next[weekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            enabled: nextEnabled,
            exercises: nextEnabled && cur.exercises.length === 0 ? [newLine()] : cur.exercises,
          },
        },
      }
      return next
    })
  }

  function handleToggleDayClick(weekIdx: number, dow: number) {
    const cur = weekDrafts[weekIdx]?.days[dow]
    if (cur?.enabled) {
      const count = cur.exercises.filter((e) => e.exerciseId !== '').length
      if (count > 0) {
        setPendingAction({
          type: 'toggleDay',
          weekIdx,
          dow,
          message: `El ${DAY_FULL_LABELS[dow - 1]} de la Semana ${weekIdx + 1} tiene ${count} ${count === 1 ? 'ejercicio' : 'ejercicios'} que se perderán.`,
        })
        return
      }
    }
    toggleDay(weekIdx, dow)
  }

  function confirmPendingAction() {
    if (!pendingAction) return
    if (pendingAction.type === 'toggleDay') {
      toggleDay(pendingAction.weekIdx, pendingAction.dow)
    } else {
      applyWeeksChange(pendingAction.newWeeks)
    }
    setPendingAction(null)
  }

  function cancelPendingAction() {
    setPendingAction(null)
  }

  function setWeekType(weekIdx: number, type: WeekDraft['weekType']) {
    setWeekDrafts((prev) => {
      const next = [...prev]
      next[weekIdx] = { ...next[weekIdx]!, weekType: type }
      return next
    })
  }

  function addExercise(dow: number) {
    const line = newLine()
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[activeWeekIdx]!
      next[activeWeekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: { ...w.days[dow]!, exercises: [...w.days[dow]!.exercises, line] },
        },
      }
      return next
    })
    setExpandedLineId(line.id)
  }

  function removeExercise(dow: number, lineId: string) {
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[activeWeekIdx]!
      next[activeWeekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            ...w.days[dow]!,
            exercises: w.days[dow]!.exercises.filter((l) => l.id !== lineId),
          },
        },
      }
      return next
    })
  }

  function updateLine(dow: number, lineId: string, patch: Partial<ExerciseLine>) {
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[activeWeekIdx]!
      next[activeWeekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            ...w.days[dow]!,
            exercises: w.days[dow]!.exercises.map((l) =>
              l.id === lineId ? { ...l, ...patch } : l
            ),
          },
        },
      }
      return next
    })
  }

  function goToStage2() {
    if (!name.trim()) return
    setActiveStage('stage2')
    setStage2View('dayMap')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToStage1() {
    setActiveStage('stage1')
    setStage2View('dayMap')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function enterDayEditor(dow: number) {
    setActiveDow(dow)
    setStage2View('dayEditor')
    setExpandedLineId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToDayMap() {
    setStage2View('dayMap')
    setExpandedLineId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const canSave = !isPending && exercises.length > 0

  const saveButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canSave}
      style={{
        height: 34,
        padding: '0 16px',
        borderRadius: 20,
        border: 'none',
        fontSize: 13,
        fontWeight: 700,
        color: '#0A0A0A',
        backgroundColor: canSave ? '#B5F23D' : '#8BA82B',
        cursor: canSave ? 'pointer' : 'not-allowed',
        whiteSpace: 'nowrap',
      }}
    >
      {isPending ? '...' : 'Guardar'}
    </button>
  )

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
          title={mode === 'edit' ? '¡Plan actualizado!' : '¡Plan creado!'}
          hint="Redirigiendo a biblioteca..."
        />
      ) : null}

      {activeStage === 'stage1' ? (
        <FlowHeaderConfig
          title={mode === 'edit' ? 'Editar plan' : 'Nuevo plan'}
          fallbackHref="/coach/library?tab=plans"
        />
      ) : stage2View === 'dayEditor' && activeDow !== null ? (
        <FlowHeaderConfig
          title={`Semana ${activeWeekIdx + 1} · ${DAY_FULL_LABELS[activeDow - 1]}`}
          fallbackHref="/coach/library?tab=plans"
          onBack={goToDayMap}
          rightSlot={saveButton}
        />
      ) : (
        <FlowHeaderConfig
          title={name.trim() || 'Nuevo plan'}
          fallbackHref="/coach/library?tab=plans"
          onBack={goToStage1}
          rightSlot={saveButton}
        />
      )}

      {activeStage === 'stage2' && stage2View === 'dayMap' && (
        <div
          style={{
            flexShrink: 0,
            backgroundColor: '#0A0A0A',
            borderBottom: '1px solid #1F2227',
            padding: '10px 20px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {weekDrafts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveWeekIdx(i)}
                style={{
                  flexShrink: 0,
                  height: 34,
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
                S{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
        }}
      >
        <form
          id={FORM_ID}
          action={formAction}
          style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <input type="hidden" name="planPayload" value={planPayload} readOnly />
          <input type="hidden" name="builderMode" value={mode} readOnly />
          {mode === 'edit' && initialPlan ? (
            <input type="hidden" name="planId" value={initialPlan.planId} readOnly />
          ) : null}

          {activeStage === 'stage1' ? (
            <>
              <Field label="Nombre">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  style={inputStyle}
                  placeholder="Fuerza 4 semanas"
                  autoComplete="off"
                />
              </Field>

              <Field label="Descripción (opcional)">
                <input
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
                  value={String(weekDrafts.length)}
                  onChange={(e) => {
                    const v = Math.min(12, Math.max(1, Number(e.target.value) || 1))
                    handleWeeksChange(v)
                  }}
                  type="number"
                  min={1}
                  max={12}
                  style={inputStyle}
                />
              </Field>

              {/* Week cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {weekDrafts.map((w, weekIdx) => (
                  <div
                    key={weekIdx}
                    style={{
                      backgroundColor: '#111317',
                      border: '1px solid #1F2227',
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
                        Semana {weekIdx + 1}
                      </p>
                      <select
                        value={w.weekType}
                        onChange={(e) => setWeekType(weekIdx, e.target.value as WeekDraft['weekType'])}
                        style={{
                          height: 32,
                          paddingLeft: 10,
                          paddingRight: 10,
                          borderRadius: 8,
                          border: '1px solid #2A2D34',
                          backgroundColor: '#0A0A0A',
                          color: w.weekType !== 'normal' ? '#B5F23D' : '#9CA3AF',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="normal">Normal</option>
                        <option value="deload">Deload</option>
                        <option value="peak">Peak</option>
                        <option value="test">Test</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between' }}>
                      {DAY_LABELS.map((lbl, idx) => {
                        const dow = idx + 1
                        const on = w.days[dow]?.enabled
                        return (
                          <button
                            key={dow}
                            type="button"
                            onClick={() => handleToggleDayClick(weekIdx, dow)}
                            aria-pressed={on}
                            style={{
                              flex: '1 0 0',
                              height: 34,
                              borderRadius: 9999,
                              border: `1.5px solid ${on ? '#B5F23D' : '#2A2D34'}`,
                              backgroundColor: on ? '#B5F23D' : 'transparent',
                              color: on ? '#0A0A0A' : '#6B7280',
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {lbl}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
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
                  <p style={{ fontSize: 13, color: '#F2994A', lineHeight: 1.45, margin: 0 }}>
                    Primero necesitás ejercicios en tu biblioteca. Creá al menos uno en{' '}
                    <Link href="/coach/library/exercises/new" style={{ color: '#B5F23D' }}>
                      Ejercicios
                    </Link>
                    .
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={goToStage2}
                disabled={!name.trim()}
                style={{
                  alignSelf: 'stretch',
                  height: 52,
                  borderRadius: 14,
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  color: name.trim() ? '#0A0A0A' : '#5C6370',
                  backgroundColor: name.trim() ? '#B5F23D' : '#1C2010',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background-color 150ms ease',
                }}
              >
                Continuar →
              </button>
            </>
          ) : (
            <div>
              {stage2View === 'dayMap' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {enabledSorted.length === 0 ? (
                    <div
                      style={{
                        backgroundColor: '#111317',
                        border: '1px solid #1F2227',
                        borderRadius: 14,
                        padding: '28px 20px',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                        Esta semana no tiene días activos.
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#4A5260',
                          margin: '8px 0 0',
                          lineHeight: 1.4,
                        }}
                      >
                        Volvé a Etapa 1 para activar días en esta semana.
                      </p>
                    </div>
                  ) : (
                    enabledSorted.map((dow) => {
                      const day = activeDays[dow]!
                      const exerciseCount = day.exercises.filter((e) => e.exerciseId).length
                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() => enterDayEditor(dow)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#111317',
                            border: '1px solid #1F2227',
                            borderRadius: 14,
                            padding: '16px 18px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#F0F0F0',
                                margin: 0,
                              }}
                            >
                              {DAY_FULL_LABELS[dow - 1]}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: exerciseCount > 0 ? '#B5F23D' : '#6B7280',
                                margin: '4px 0 0',
                              }}
                            >
                              {exerciseCount > 0
                                ? `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`
                                : 'Sin ejercicios'}
                            </p>
                          </div>
                          <ChevronRight size={20} color="#6B7280" />
                        </button>
                      )
                    })
                  )}
                </div>
              ) : activeDow !== null && activeDays[activeDow]?.enabled ? (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#6B7280',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: '0 0 14px',
                    }}
                  >
                    Ejercicios del día
                  </p>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, activeDow)}
                  >
                    <SortableContext
                      items={activeDays[activeDow].exercises.map((e) => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeDays[activeDow].exercises.map((line, exerciseIndex) => {
                          const isCardio = exerciseById.get(line.exerciseId)?.type === 'cardio'
                          const isExpanded = expandedLineId === line.id
                          const exerciseName = exerciseById.get(line.exerciseId)?.name ?? null

                          return (
                            <SortableExerciseCard
                              key={line.id}
                              line={line}
                              exerciseIndex={exerciseIndex}
                              isExpanded={isExpanded}
                              exerciseName={exerciseName}
                              isCardio={isCardio}
                              exercises={exercises}
                              onToggleExpand={() => setExpandedLineId(isExpanded ? null : line.id)}
                              onRemove={() => {
                                removeExercise(activeDow, line.id)
                                setExpandedLineId(null)
                              }}
                              onUpdateLine={(patch) => updateLine(activeDow, line.id, patch)}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

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
                </div>
              ) : null}

              {state && !state.success && 'error' in state && (
                <div
                  role="alert"
                  style={{
                    marginTop: 8,
                    backgroundColor: 'rgba(242, 82, 82, 0.08)',
                    border: '1px solid rgba(242, 82, 82, 0.25)',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45, margin: 0 }}>
                    {state.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="destructive-warning-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0 24px',
          }}
        >
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <h2
              id="destructive-warning-title"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F0F0F0',
                margin: '0 0 10px',
              }}
            >
              ¿Eliminar ejercicios?
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#9CA3AF',
                lineHeight: 1.5,
                margin: '0 0 20px',
              }}
            >
              {pendingAction.message}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={cancelPendingAction}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: '1.5px solid #3D4047',
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPendingAction}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#F25252',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
