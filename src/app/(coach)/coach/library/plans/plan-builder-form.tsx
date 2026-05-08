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
import { Check, ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
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
import FilterTabs, { type FilterTabItem } from '@/components/ui/filter-tabs'

const FORM_ID = 'plan-builder-form'

/**
 * Etapa 1 · campo Semanas: desplaza el número horizontalmente respecto al centro del contenedor (px).
 * Valor positivo = más a la izquierda. Negativo = más a la derecha. 0 = centrado.
 */
const STAGE1_SEMANAS_NUMBER_OFFSET_X_PX: number = 10

/**
 * Etapa 2 · mapa de días: ancho máximo de las tarjetas (centradas). Cambiá el valor en px.
 */
const STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX = 250

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

const stage1TextFieldContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  backgroundColor: 'rgba(37, 42, 49, 0.42)',
  border: 'none',
  borderRadius: 14,
  minHeight: 44,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
}

const stage1TextInputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  background: 'none',
  border: 'none',
  outline: 'none',
  color: '#F0F0F0',
  fontSize: 15,
  fontFamily: 'inherit',
  caretColor: '#B5F23D',
  padding: '0 14px',
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

const WEEK_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'deload', label: 'Deload' },
  { value: 'peak', label: 'Peak' },
  { value: 'test', label: 'Test' },
] as const

/** En etapa 2 no mostrar alert roja: ya se comunica con el botón Guardar/listo deshabilitado. */
const PLAN_BUILDER_STAGE2_SILENT_ERRORS = new Set([
  'Cada día debe tener al menos un ejercicio',
  'El plan debe tener al menos un ejercicio',
])

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

function Field({
  label,
  children,
  alignCenter,
}: {
  label: ReactNode
  children: ReactNode
  /** Centra label e hijos en el eje horizontal del formulario */
  alignCenter?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: alignCenter ? 'center' : 'stretch',
      }}
    >
      <label
        style={{
          ...labelStyle,
          ...(alignCenter ? { alignSelf: 'stretch', textAlign: 'center' as const } : {}),
        }}
      >
        {label}
      </label>
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
        borderTop: '1px solid #252830',
        borderRight: '1px solid #252830',
        borderBottom: '1px solid #252830',
        borderLeft: '3px solid #B5F23D',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          minWidth: 0,
        }}
      >
        <span
          {...attributes}
          {...listeners}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#8A95A3',
            cursor: isDragging ? 'grabbing' : 'grab',
            lineHeight: 1,
            userSelect: 'none',
            flexShrink: 0,
            touchAction: 'none',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          ≡
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#B5F23D',
            letterSpacing: '0.1em',
            flexShrink: 0,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {n}
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? `Colapsar ejercicio ${n}` : `Expandir ejercicio ${n}`}
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: 6,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#F0F0F0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <p
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#F0F0F0',
                textTransform: 'uppercase',
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
                  display: 'block',
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
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronDown
              size={18}
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            />
          </span>
        </button>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ height: 1, backgroundColor: '#1A1D22', margin: '12px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 6 }}>Ejercicio</label>
              <CustomSelect
                key={`${line.id}-${line.exerciseId}`}
                required
                value={line.exerciseId}
                onChange={(v) => onUpdateLine({ exerciseId: v })}
                maxMenuHeight={150}
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
                gridTemplateColumns: isCardio ? 'repeat(2, 80px)' : 'repeat(3, 80px)',
                columnGap: 24,
                rowGap: 18,
                justifyContent: 'center',
              }}
            >
              <div>
                <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>Series</label>
                <input
                  value={line.sets}
                  onChange={(e) => onUpdateLine({ sets: e.target.value })}
                  inputMode="numeric"
                  style={{ ...inputStyle, textAlign: 'center', borderRadius: 24 }}
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
                    <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>
                      Reps min
                    </label>
                    <input
                      value={line.repsMin}
                      onChange={(e) => onUpdateLine({ repsMin: e.target.value })}
                      inputMode="numeric"
                      placeholder="8"
                      style={{ ...inputStyle, textAlign: 'center', borderRadius: 24 }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>
                      Reps max
                    </label>
                    <input
                      value={line.repsMax}
                      onChange={(e) => onUpdateLine({ repsMax: e.target.value })}
                      inputMode="numeric"
                      placeholder="12"
                      style={{ ...inputStyle, textAlign: 'center', borderRadius: 24 }}
                    />
                  </div>
                </>
              )}
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>
                    Descanso (opcional)
                  </label>
                  <div style={{ position: 'relative', width: 100 }}>
                    <input
                      value={line.restSeconds}
                      onChange={(e) => onUpdateLine({ restSeconds: e.target.value })}
                      inputMode="numeric"
                      style={{ ...inputStyle, width: '100%', paddingRight: 34 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6B7280',
                        pointerEvents: 'none',
                      }}
                    >
                      seg
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label={`Quitar ejercicio ${n}`}
                  style={{
                    width: 44,
                    height: 44,
                    marginBottom: 0,
                    background: 'none',
                    border: 'none',
                    borderRadius: 0,
                    color: '#F25252',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={20} />
                </button>
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
  const weekPickerRef = useRef<HTMLDivElement>(null)

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
  const [weekPickerOpen, setWeekPickerOpen] = useState(false)
  const [weekTypePickerOpenIdx, setWeekTypePickerOpenIdx] = useState<number | null>(null)

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

  /** Al menos un día activo en todo el plan (evita guardar vacío sin días configurados). */
  const hasAnyActiveDayAcrossPlan = useMemo(
    () =>
      weekDrafts.some((w) => Object.values(w.days).some((d) => d.enabled)),
    [weekDrafts]
  )

  /** Cada día activo debe tener ≥1 línea con ejercicio elegido en la biblioteca. */
  const everyActiveDayHasChosenExercise = useMemo(() => {
    for (const w of weekDrafts) {
      for (let dow = 1; dow <= 7; dow++) {
        const day = w.days[dow]
        if (!day?.enabled) continue
        if (!day.exercises.some((e) => e.exerciseId.trim() !== '')) return false
      }
    }
    return true
  }, [weekDrafts])

  /** Filtros de semana (Etapa 2): mismo patrón que biblioteca / ejercicios. */
  const weekStage2FilterItems = useMemo<FilterTabItem[]>(
    () =>
      weekDrafts.map((_, i) => ({
        id: String(i),
        label: `S${i + 1}`,
        activeBackground: '#B5F23D',
        activeColor: '#0A0A0A',
      })),
    [weekDrafts]
  )

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

  useEffect(() => {
    if (!weekPickerOpen) return
    function handleOutsideClick(event: MouseEvent) {
      if (!weekPickerRef.current?.contains(event.target as Node)) {
        setWeekPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [weekPickerOpen])

  useEffect(() => {
    if (weekTypePickerOpenIdx === null) return
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('[data-week-type-picker="true"]')) {
        setWeekTypePickerOpenIdx(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [weekTypePickerOpenIdx])

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

  const canSave =
    !isPending &&
    exercises.length > 0 &&
    hasAnyActiveDayAcrossPlan &&
    everyActiveDayHasChosenExercise

  const saveButtonAriaLabel = isPending
    ? 'Guardando plan…'
    : exercises.length === 0
      ? 'Agregá al menos un ejercicio en tu biblioteca para guardar'
      : !hasAnyActiveDayAcrossPlan
        ? 'Activá al menos un día en el plan para guardar'
        : !everyActiveDayHasChosenExercise
          ? 'Completá cada día activo con al menos un ejercicio antes de guardar'
          : 'Guardar plan'

  const saveButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canSave}
      aria-label={saveButtonAriaLabel}
      aria-busy={isPending}
      style={{
        flexShrink: 0,
        width: 38,
        height: 38,
        padding: 0,
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: canSave ? '#B5F23D' : '#8BA82B',
        cursor: canSave ? 'pointer' : 'not-allowed',
      }}
    >
      {isPending ? (
        <Loader2
          className="plan-builder-header-save-spinner"
          size={19}
          color="#0A0A0A"
          aria-hidden
          style={{
            animation: 'planBuilderSpin 0.75s linear infinite',
          }}
        />
      ) : (
        <Check size={21} strokeWidth={2.5} color="#0A0A0A" aria-hidden />
      )}
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
      <style>{`
        @keyframes planBuilderContinuarArrow {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(6px);
          }
        }
        @keyframes planBuilderSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-plan-continuar-arrow='true'] {
            animation: none !important;
          }
          .plan-builder-header-save-spinner {
            animation: none !important;
          }
        }
      `}</style>
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
          title={`Sem ${activeWeekIdx + 1} · ${DAY_FULL_LABELS[activeDow - 1]}`}
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
            paddingTop: 10,
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 14,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <FilterTabs
              items={weekStage2FilterItems}
              activeId={String(activeWeekIdx)}
              onChange={(id) => setActiveWeekIdx(Number(id))}
              inactiveBackground="rgba(75, 85, 99, 0.34)"
              inactiveColor="rgba(218, 224, 233, 0.72)"
              inactiveBorder="transparent"
            />
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
                <div style={stage1TextFieldContainerStyle}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    style={stage1TextInputStyle}
                    placeholder="Fuerza 4 semanas"
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field
                label={
                  <>
                    Descripción{' '}
                    <span style={{ color: '#CBD5E1', fontWeight: 500 }}>(opcional)</span>
                  </>
                }
              >
                <div style={stage1TextFieldContainerStyle}>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    type="text"
                    style={stage1TextInputStyle}
                    placeholder="Objetivo, enfoque, notas…"
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field label="Semanas" alignCenter>
                <div
                  ref={weekPickerRef}
                  style={{
                    ...stage1TextFieldContainerStyle,
                    position: 'relative',
                    width: 'min(80px, 100%)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setWeekPickerOpen((prev) => !prev)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      minHeight: 44,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#F0F0F0',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      padding: '0 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        transform:
                          STAGE1_SEMANAS_NUMBER_OFFSET_X_PX !== 0
                            ? `translateX(${-STAGE1_SEMANAS_NUMBER_OFFSET_X_PX}px)`
                            : undefined,
                      }}
                    >
                      {weekDrafts.length}
                    </span>
                    <ChevronDown
                      size={16}
                      color="#B5F23D"
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: weekPickerOpen
                          ? 'translateY(-50%) rotate(180deg)'
                          : 'translateY(-50%) rotate(0deg)',
                        transition: 'transform 150ms ease',
                        flexShrink: 0,
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  {weekPickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        maxHeight: 220,
                        overflowY: 'auto',
                        backgroundColor: '#111317',
                        border: '1px solid #2A2D34',
                        borderRadius: 10,
                        boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                        zIndex: 60,
                      }}
                    >
                      {Array.from({ length: 60 }, (_, index) => {
                        const value = index + 1
                        const isSelected = weekDrafts.length === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              handleWeeksChange(value)
                              setWeekPickerOpen(false)
                            }}
                            style={{
                              width: '100%',
                              height: 34,
                              padding: '0 12px',
                              border: 'none',
                              borderBottom: value < 60 ? '1px solid #1A1D22' : 'none',
                              backgroundColor: isSelected ? 'rgba(181,242,61,0.12)' : 'transparent',
                              color: isSelected ? '#B5F23D' : '#F0F0F0',
                              fontSize: 14,
                              fontWeight: isSelected ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Field>

              {/* Week cards */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {weekDrafts.map((w, weekIdx) => (
                  <div key={weekIdx}>
                    <div
                      style={{
                        backgroundColor: 'transparent',
                        padding: '14px 0',
                      }}
                    >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 15,
                        paddingBottom: 2,
                      }}
                    >
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#B5F23D', margin: 0 }}>
                        Semana {weekIdx + 1}
                      </p>
                      <div
                        data-week-type-picker="true"
                        style={{ position: 'relative', minWidth: 108 }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setWeekTypePickerOpenIdx((prev) => (prev === weekIdx ? null : weekIdx))
                          }
                          style={{
                            ...inputStyle,
                            height: 30,
                            minWidth: 100,
                            paddingLeft: 14,
                            paddingRight: 14,
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#F0F0F0',
                            fontSize: 12,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                          }}
                        >
                          <span>{WEEK_TYPE_OPTIONS.find((opt) => opt.value === w.weekType)?.label}</span>
                          <ChevronDown
                            size={16}
                            color="#B5F23D"
                            aria-hidden="true"
                            style={{
                              transform: weekTypePickerOpenIdx === weekIdx ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 150ms ease',
                              flexShrink: 0,
                            }}
                          />
                        </button>

                        {weekTypePickerOpenIdx === weekIdx && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 6px)',
                              left: 0,
                              right: 0,
                              maxHeight: 220,
                              overflowY: 'auto',
                              backgroundColor: '#111317',
                              border: 'none',
                              borderRadius: 10,
                              boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                              zIndex: 60,
                            }}
                          >
                            {WEEK_TYPE_OPTIONS.map((option, optionIdx) => {
                              const isSelected = option.value === w.weekType
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setWeekType(weekIdx, option.value)
                                    setWeekTypePickerOpenIdx(null)
                                  }}
                                  style={{
                                    width: '100%',
                                    height: 34,
                                    padding: '0 12px',
                                    border: 'none',
                                    borderBottom:
                                      optionIdx < WEEK_TYPE_OPTIONS.length - 1
                                        ? '1px solid #1A1D22'
                                        : 'none',
                                    backgroundColor: isSelected
                                      ? 'rgba(181,242,61,0.12)'
                                      : 'transparent',
                                    color: isSelected ? '#B5F23D' : '#F0F0F0',
                                    fontSize: 14,
                                    fontWeight: isSelected ? 700 : 500,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between', paddingTop: 1 }}>
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
                  {weekIdx < weekDrafts.length - 1 ? (
                    <div
                      role="presentation"
                      style={{
                        paddingTop: 16,
                        paddingBottom: 16,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
                    </div>
                  ) : null}
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
                  alignSelf: 'center',
                  width: 'fit-content',
                  height: 42,
                  borderRadius: 20,
                  border: 'none',
                  padding: '0 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: name.trim() ? '#0A0A0A' : '#5C6370',
                  backgroundColor: name.trim() ? '#B5F23D' : '#1C2010',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  transition: 'background-color 150ms ease',
                }}
              >
                <span>Continuar</span>
                <span
                  aria-hidden
                  data-plan-continuar-arrow="true"
                  style={
                    name.trim()
                      ? {
                          display: 'inline-block',
                          animation: 'planBuilderContinuarArrow 1s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  →
                </span>
              </button>
            </>
          ) : (
            <div>
              {stage2View === 'dayMap' ? (
                <div
                  style={{
                    width: '100%',
                    maxWidth: STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
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
                            backgroundColor: '#111317',
                            borderRadius: 14,
                            padding: '10px 12px 10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, textAlign: 'left', display: 'block' }}>
                            <p
                              style={{
                                fontSize: 15,
                                fontWeight: 400,
                                color: '#B5F23D',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                margin: 0,
                              }}
                            >
                              {DAY_FULL_LABELS[dow - 1]}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: '#9CA3AF',
                                margin: '5px 0 0',
                                lineHeight: 1.45,
                              }}
                            >
                              {exerciseCount > 0
                                ? `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`
                                : 'Sin ejercicios'}
                            </p>
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 44,
                              minHeight: 44,
                              flexShrink: 0,
                              color: '#F0F0F0',
                            }}
                          >
                            <ChevronRight size={22} strokeWidth={2.6} aria-hidden />
                          </div>
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
                      borderRadius: 0,
                      border: 'none',
                      background: 'none',
                      color: '#B5F23D',
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={20} strokeWidth={2.5} />
                    Agregar ejercicio
                  </button>
                </div>
              ) : null}

              {state &&
                !state.success &&
                'error' in state &&
                !(
                  activeStage === 'stage2' &&
                  PLAN_BUILDER_STAGE2_SILENT_ERRORS.has(state.error)
                ) && (
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
