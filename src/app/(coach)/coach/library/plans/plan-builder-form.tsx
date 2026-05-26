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
import { Check, ChevronDown, ChevronRight, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
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
  | { type: 'toggleDay'; weekIdx: number; dow: number; count: number }
  | { type: 'reduceWeeks'; newWeeks: number; affectedWeeks: number[] }
  | { type: 'pasteReplace'; targetWeekIdx: number; targetDow: number; exerciseCount: number }
  | { type: 'pastePaste'; targetWeekIdx: number; targetDow: number; sourceExerciseCount: number }

type ClipboardDay = {
  sourceWeekIdx: number
  sourceDow: number
  exercises: ExerciseLine[]
}


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

/** Clon profundo de semanas/días/ejercicios (incluye ids de líneas) para snapshot al entrar a Stage 2. */
function deepCloneWeekDrafts(weeks: WeekDraft[]): WeekDraft[] {
  return weeks.map((w) => ({
    weekType: w.weekType,
    days: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((dow) => {
        const d = w.days[dow]!
        return [
          dow,
          {
            enabled: d.enabled,
            exercises: d.exercises.map((e) => ({ ...e })),
          },
        ]
      })
    ) as Record<number, DayDraft>,
  }))
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

/** Baseline idéntico al draft hidratado desde el servidor — compara con `serializeForDirtyCheck` del estado actual. */
function serializeSavedPlanBaseline(initial: PlanBuilderInitial): string {
  return serializeForDirtyCheck(
    initial.name,
    (initial.description ?? '').trim(),
    daysFromInitial(initial)
  )
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

function serializeForDirtyCheck(
  name: string,
  description: string,
  weekDrafts: WeekDraft[]
): string {
  return JSON.stringify({
    name: name.trim(),
    description: description.trim(),
    weekDrafts: weekDrafts.map((w) => ({
      weekType: w.weekType,
      days: Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((dow) => {
          const day = w.days[dow]!
          return [
            dow,
            {
              enabled: day.enabled,
              exercises: day.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                sets: e.sets,
                repsMin: e.repsMin,
                repsMax: e.repsMax,
                durationSeconds: e.durationSeconds,
                restSeconds: e.restSeconds,
              })),
            },
          ]
        })
      ),
    })),
  })
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
          <div style={{ height: 1, backgroundColor: '#1A1D22', margin: '10px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 6, paddingLeft: 10 }}>Ejercicio</label>
              <CustomSelect
                key={`${line.id}-${line.exerciseId}`}
                limeBorder
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
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  minHeight: 44,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 80,
                  }}
                >
                  <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center', width: '100%' }}>
                    Descanso (opcional)
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      value={line.restSeconds}
                      onChange={(e) => onUpdateLine({ restSeconds: e.target.value })}
                      inputMode="numeric"
                      style={{
                        ...inputStyle,
                        width: '100%',
                        paddingRight: 35,
                        textAlign: 'left',
                        borderRadius: 10,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 8,
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
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 44,
                    height: 44,
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
  const weekViewportRef = useRef<HTMLDivElement>(null)
  const weekTabsOuterRef = useRef<HTMLDivElement>(null)
  const weekTabsTrackRef = useRef<HTMLDivElement>(null)
  const weekTabBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const weekTabTextRefs = useRef<(HTMLSpanElement | null)[]>([])

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
  const weekIndicatorRef = useRef<HTMLDivElement>(null)
  const chipsInnerRef = useRef<HTMLDivElement>(null)

  const [clipboard, setClipboard] = useState<ClipboardDay | null>(null)
  const [pendingPasteWeekIdx, setPendingPasteWeekIdx] = useState<number | null>(null)
  const [pendingPasteDow, setPendingPasteDow] = useState<number | null>(null)
  const [stage2ExitSheetOpen, setStage2ExitSheetOpen] = useState(false)
  /** Tras guardar desde stage 1 (solo nombre/descripción), ir a biblioteca en vez de la vista del plan. */
  const redirectToLibraryAfterStage1ListoRef = useRef(false)

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const savedPlanBaselineSerialized = useMemo(
    () => (mode === 'edit' && initialPlan ? serializeSavedPlanBaseline(initialPlan) : null),
    [mode, initialPlan]
  )

  /** Estado del draft al entrar a Stage 2 — aviso al volver a Stage 1 y restauración al descartar. */
  const stage2EntryCapRef = useRef<{
    name: string
    description: string
    weekDrafts: WeekDraft[]
  } | null>(null)

  const currentSnapshot = useMemo(
    () => (mode === 'edit' ? serializeForDirtyCheck(name, description, weekDrafts) : null),
    [mode, name, description, weekDrafts]
  )

  const isDirty =
    mode === 'edit' &&
    savedPlanBaselineSerialized !== null &&
    currentSnapshot !== savedPlanBaselineSerialized

  const initialEditWeekCount = initialPlan?.planWeeks.length ?? 0

  const stage1MetaChanged =
    mode === 'edit' &&
    !!initialPlan &&
    (name.trim() !== initialPlan.name.trim() ||
      description.trim() !== (initialPlan.description ?? '').trim())

  const stage1WeeksCountUnchanged =
    mode === 'edit' && !!initialPlan && weekDrafts.length === initialEditWeekCount

  const isStage2DirtyVsEntry = useMemo(() => {
    if (activeStage !== 'stage2' || stage2View !== 'dayMap') return false
    const cap = stage2EntryCapRef.current
    if (!cap) return false
    return (
      serializeForDirtyCheck(name, description, weekDrafts) !==
      serializeForDirtyCheck(cap.name, cap.description, cap.weekDrafts)
    )
  }, [activeStage, stage2View, name, description, weekDrafts])

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

  useEffect(() => {
    if (state && !state.success) {
      redirectToLibraryAfterStage1ListoRef.current = false
    }
  }, [state])

  useEffect(() => {
    if (!state?.success) return
    const timer = setTimeout(() => {
      if (mode === 'edit' && redirectToLibraryAfterStage1ListoRef.current) {
        redirectToLibraryAfterStage1ListoRef.current = false
        router.push('/coach/library?tab=plans')
        return
      }
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

  // Posiciona el indicador, sincroniza colores de tabs y el chips track — todo via DOM directo
  function syncIndicator(weekIdx: number, animated: boolean) {
    const el = weekIndicatorRef.current
    const btn = weekTabBtnRefs.current[weekIdx]
    if (!el || !btn) return

    // Indicador
    const left = btn.offsetLeft + 14
    const width = btn.offsetWidth - 28
    el.style.transition = animated ? 'left 220ms ease, width 220ms ease' : ''
    el.style.left = `${left}px`
    el.style.width = `${width}px`

    // Colores de tabs — con transición suave al settlear el snap
    weekTabBtnRefs.current.forEach((tabBtn, i) => {
      if (!tabBtn) return
      const isActive = i === weekIdx
      tabBtn.style.transition = animated ? 'color 180ms ease' : ''
      tabBtn.style.color = isActive ? '#F0F0F0' : '#6B7280'
      tabBtn.style.fontWeight = isActive ? '600' : '500'
    })

    // Chips track — salta instantáneamente a la posición del snap
    const viewport = weekViewportRef.current
    const chipsEl = chipsInnerRef.current
    if (viewport && chipsEl) {
      const scrollLeft = weekIdx * viewport.clientWidth
      chipsEl.style.transition = ''
      chipsEl.style.transform = `translateX(-${scrollLeft}px)`
    }

    // Tab track — centra el tab activo
    const track = weekTabsTrackRef.current
    const outer = weekTabsOuterRef.current
    if (track && outer) {
      const containerWidth = outer.offsetWidth
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2
      track.style.transition = animated ? 'transform 220ms ease' : ''
      track.style.transform = `translateX(${containerWidth / 2 - btnCenter}px)`
    }
  }

  // Sincroniza el indicador al posicionarse en Stage 2 dayMap (sin animación)
  useEffect(() => {
    if (activeStage !== 'stage2' || stage2View !== 'dayMap') return
    const raf = requestAnimationFrame(() => syncIndicator(activeWeekIdx, false))
    return () => cancelAnimationFrame(raf)
  // Solo al entrar al stage/view — activeWeekIdx se omite a propósito
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, stage2View])

  // Mueve el indicador en tiempo real durante el swipe (evento pasivo, sin re-renders)
  useEffect(() => {
    if (activeStage !== 'stage2' || stage2View !== 'dayMap') return
    const viewport = weekViewportRef.current
    if (!viewport) return

    function onScroll() {
      const vw = viewport!.clientWidth
      if (vw <= 0) return
      const progress = viewport!.scrollLeft / vw
      const fromIdx = Math.max(0, Math.floor(progress))
      const toIdx = Math.min(weekDrafts.length - 1, Math.ceil(progress))
      const t = progress - Math.floor(progress)

      const fromBtn = weekTabBtnRefs.current[fromIdx]
      const toBtn = weekTabBtnRefs.current[toIdx]
      const el = weekIndicatorRef.current
      if (!fromBtn || !toBtn || !el) return

      // Indicador
      const fromLeft = fromBtn.offsetLeft + 14
      const toLeft = toBtn.offsetLeft + 14
      const fromW = fromBtn.offsetWidth - 28
      const toW = toBtn.offsetWidth - 28
      el.style.transition = ''
      el.style.left = `${fromLeft + (toLeft - fromLeft) * t}px`
      el.style.width = `${fromW + (toW - fromW) * t}px`

      // Chips track — mueve 1:1 con el viewport
      const chipsEl = chipsInnerRef.current
      if (chipsEl) {
        chipsEl.style.transition = ''
        chipsEl.style.transform = `translateX(-${viewport!.scrollLeft}px)`
      }

      // Tab track — centra interpolado entre fromBtn y toBtn
      const track = weekTabsTrackRef.current
      const outer = weekTabsOuterRef.current
      if (track && outer) {
        const containerWidth = outer.offsetWidth
        const fromCenter = fromBtn.offsetLeft + fromBtn.offsetWidth / 2
        const toCenter = toBtn.offsetLeft + toBtn.offsetWidth / 2
        const interpolatedCenter = fromCenter + (toCenter - fromCenter) * t
        track.style.transition = ''
        track.style.transform = `translateX(${containerWidth / 2 - interpolatedCenter}px)`
      }

      // Colores de tabs — interpolados en sync con el indicador
      // #6B7280 → #F0F0F0: r 107→240 g 114→240 b 128→240
      weekTabBtnRefs.current.forEach((tabBtn, i) => {
        if (!tabBtn) return
        const active = i === fromIdx ? 1 - t : i === toIdx ? t : 0
        const r = Math.round(107 + 133 * active)
        const g = Math.round(114 + 126 * active)
        const b = Math.round(128 + 112 * active)
        tabBtn.style.transition = ''
        tabBtn.style.color = `rgb(${r},${g},${b})`
        tabBtn.style.fontWeight = active > 0.5 ? '600' : '500'
      })
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [activeStage, stage2View, weekDrafts.length])

  // scrollend: actualiza React state SOLO cuando el snap se completa — elimina el jank
  useEffect(() => {
    if (activeStage !== 'stage2' || stage2View !== 'dayMap') return
    const viewport = weekViewportRef.current
    if (!viewport) return

    function onScrollEnd() {
      const vw = viewport!.clientWidth
      if (vw <= 0) return
      const idx = Math.round(viewport!.scrollLeft / vw)
      const next = Math.min(Math.max(idx, 0), weekDrafts.length - 1)
      setActiveWeekIdx(next)
      requestAnimationFrame(() => syncIndicator(next, true))
    }

    viewport.addEventListener('scrollend', onScrollEnd)
    return () => viewport.removeEventListener('scrollend', onScrollEnd)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, stage2View, weekDrafts.length])

  // Reinicia la posición del viewport al entrar a Stage 2 dayMap
  useEffect(() => {
    if (activeStage !== 'stage2' || stage2View !== 'dayMap') return
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * activeWeekIdx, behavior: 'auto' })
  // Solo al entrar al stage/view
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, stage2View])


  function scrollWeekTo(weekIdx: number) {
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * weekIdx, behavior: 'smooth' })
    setActiveWeekIdx(weekIdx)
    requestAnimationFrame(() => syncIndicator(weekIdx, false))
  }

  function copyDay(weekIdx: number, dow: number) {
    const day = weekDrafts[weekIdx]?.days[dow]
    if (!day?.enabled) return
    setClipboard({
      sourceWeekIdx: weekIdx,
      sourceDow: dow,
      exercises: day.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
    })
  }

  function pasteDay(targetWeekIdx: number, targetDow: number) {
    if (!clipboard) return
    const newExercises = clipboard.exercises.map((e) => ({ ...e, id: crypto.randomUUID() }))
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[targetWeekIdx]!
      next[targetWeekIdx] = {
        ...w,
        days: {
          ...w.days,
          [targetDow]: {
            enabled: true,
            exercises: newExercises.length > 0 ? newExercises : [newLine()],
          },
        },
      }
      return next
    })
    setClipboard(null)
    setPendingPasteWeekIdx(null)
    setPendingPasteDow(null)
  }

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
          affectedWeeks: affectedNums,
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
      const nextEnabled = !w.days[dow]!.enabled
      next[weekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            enabled: nextEnabled,
            exercises: nextEnabled ? [newLine()] : [],
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
          count,
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
    } else if (pendingAction.type === 'reduceWeeks') {
      applyWeeksChange(pendingAction.newWeeks)
    } else if (pendingAction.type === 'pasteReplace' || pendingAction.type === 'pastePaste') {
      pasteDay(pendingAction.targetWeekIdx, pendingAction.targetDow)
    }
    setPendingAction(null)
  }

  function cancelPendingAction() {
    setPendingAction(null)
    setPendingPasteWeekIdx(null)
    setPendingPasteDow(null)
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
    redirectToLibraryAfterStage1ListoRef.current = false
    stage2EntryCapRef.current = {
      name,
      description,
      weekDrafts: deepCloneWeekDrafts(weekDrafts),
    }
    setActiveStage('stage2')
    setStage2View('dayMap')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToStage1() {
    setActiveStage('stage1')
    setStage2View('dayMap')
    setClipboard(null)
    setPendingPasteWeekIdx(null)
    setPendingPasteDow(null)
    setStage2ExitSheetOpen(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function handleBackFromStage2DayMap() {
    if (!isStage2DirtyVsEntry) {
      goToStage1()
      return
    }
    setStage2ExitSheetOpen(true)
  }

  function handleStage2ExitKeepEditing() {
    setStage2ExitSheetOpen(false)
  }

  function handleStage2ExitDiscard() {
    const cap = stage2EntryCapRef.current
    if (cap) {
      setName(cap.name)
      setDescription(cap.description)
      const restored = deepCloneWeekDrafts(cap.weekDrafts)
      setWeekDrafts(restored)
      setActiveWeekIdx((idx) => Math.min(idx, Math.max(0, restored.length - 1)))
    }
    goToStage1()
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
    everyActiveDayHasChosenExercise &&
    (mode === 'create' || isDirty)

  /** Stage 1 · editar: guardar solo si cambió nombre o descripción y NO cambió la cantidad de semanas. */
  const canStage1Listo =
    mode === 'edit' &&
    activeStage === 'stage1' &&
    !isPending &&
    exercises.length > 0 &&
    hasAnyActiveDayAcrossPlan &&
    everyActiveDayHasChosenExercise &&
    stage1MetaChanged &&
    stage1WeeksCountUnchanged

  const stage1ListoAriaLabel = isPending
    ? 'Guardando…'
    : !stage1MetaChanged
      ? 'Sin cambios en nombre o descripción'
      : !stage1WeeksCountUnchanged
        ? 'Cambiaste la cantidad de semanas: usá Continuar para configurar en el paso 2'
        : exercises.length === 0
          ? 'Necesitás ejercicios en tu biblioteca'
          : !hasAnyActiveDayAcrossPlan
            ? 'Activá al menos un día en el plan'
            : !everyActiveDayHasChosenExercise
              ? 'Completá cada día activo con ejercicios'
              : 'Guardar nombre y descripción'

  const stage1ListoButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canStage1Listo}
      aria-label={stage1ListoAriaLabel}
      aria-busy={isPending}
      onPointerDown={() => {
        if (canStage1Listo) redirectToLibraryAfterStage1ListoRef.current = true
      }}
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
        backgroundColor: canStage1Listo ? '#B5F23D' : '#3D4047',
        cursor: canStage1Listo ? 'pointer' : 'not-allowed',
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
        <Check size={21} strokeWidth={2.5} color={canStage1Listo ? '#0A0A0A' : '#6B7280'} aria-hidden />
      )}
    </button>
  )

  const saveButtonAriaLabel = isPending
    ? 'Guardando plan…'
    : exercises.length === 0
      ? 'Agregá al menos un ejercicio en tu biblioteca para guardar'
      : !hasAnyActiveDayAcrossPlan
        ? 'Activá al menos un día en el plan para guardar'
        : !everyActiveDayHasChosenExercise
          ? 'Completá cada día activo con al menos un ejercicio antes de guardar'
          : mode === 'edit' && !isDirty
            ? 'Sin cambios para guardar'
            : 'Guardar plan'

  const saveButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canSave}
      aria-label={saveButtonAriaLabel}
      aria-busy={isPending}
      onPointerDown={() => {
        redirectToLibraryAfterStage1ListoRef.current = false
      }}
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
        backgroundColor: canSave ? '#B5F23D' : '#3D4047',
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
        <Check size={21} strokeWidth={2.5} color={canSave ? '#0A0A0A' : '#6B7280'} aria-hidden />
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
        [data-week-viewport='true']::-webkit-scrollbar,
        [data-week-tabs-track='true']::-webkit-scrollbar {
          display: none;
          width: 0 !important;
          height: 0 !important;
        }
        [data-week-tabs-track='true'] button {
          color: #6B7280;
          font-weight: 500;
        }
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
        @keyframes planBuilderStage2ExitSheetIn {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-plan-continuar-arrow='true'] {
            animation: none !important;
          }
          .plan-builder-header-save-spinner {
            animation: none !important;
          }
          [data-plan-stage2-exit-sheet='true'] {
            animation: none !important;
            transform: none !important;
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
          rightSlot={mode === 'edit' ? stage1ListoButton : undefined}
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
          onBack={handleBackFromStage2DayMap}
          rightSlot={saveButton}
        />
      )}

      {activeStage === 'stage2' && stage2View === 'dayMap' && (
        <div
          style={{
            flexShrink: 0,
            backgroundColor: '#0A0A0A',
            paddingTop: 6,
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 14,
          }}
        >
          {/* Tab bar centrado — activo siempre en el centro */}
          <div style={{ marginBottom: 10 }}>
            <div
              ref={weekTabsOuterRef}
              style={{
                overflow: 'hidden',
                marginLeft: -20,
                marginRight: -20,
              }}
            >
            <div
              ref={weekTabsTrackRef}
              data-week-tabs-track="true"
              style={{
                display: 'flex',
                position: 'relative',
                paddingBottom: 6,
                paddingLeft: 20,
                paddingRight: 20,
                willChange: 'transform',
              }}
            >
              {weekDrafts.map((_, i) => {
                return (
                  <button
                    key={i}
                    ref={(node) => { weekTabBtnRefs.current[i] = node }}
                    type="button"
                    onClick={() => scrollWeekTo(i)}
                    style={{
                      flex: '0 0 auto',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      padding: '6px 14px',
                      fontSize: 15,
                      letterSpacing: '0.03em',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span ref={(node) => { weekTabTextRefs.current[i] = node }}>
                      Sem {i + 1}
                    </span>
                  </button>
                )
              })}
              {/* Indicador deslizante — controlado por DOM directo vía weekIndicatorRef */}
              <div
                ref={weekIndicatorRef}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 0,
                  height: 2,
                  backgroundColor: '#B5F23D',
                  borderRadius: 9999,
                  pointerEvents: 'none',
                }}
              />
            </div>
            </div>
          </div>

          {/* Chips track deslizante — semana activa + días se mueven con el swipe */}
          <div
            style={{
              overflow: 'clip' as React.CSSProperties['overflow'],
              marginLeft: -20,
              marginRight: -20,
            }}
          >
            <div
              ref={chipsInnerRef}
              style={{ display: 'flex', willChange: 'transform' }}
            >
              {weekDrafts.map((w, weekIdx) => (
                <div
                  key={weekIdx}
                  style={{ flex: '0 0 100%', padding: '10px 20px 14px', boxSizing: 'border-box' }}
                >
                  {/* Day chips para esta semana */}
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
          </div>
        </div>
      )}


      {/* Formulario oculto persistente — solo provee los inputs para el submit */}
      <form id={FORM_ID} action={formAction} style={{ display: 'none' }}>
        <input type="hidden" name="planPayload" value={planPayload} readOnly />
        <input type="hidden" name="builderMode" value={mode} readOnly />
        {mode === 'edit' && initialPlan ? (
          <input type="hidden" name="planId" value={initialPlan.planId} readOnly />
        ) : null}
      </form>

      {/* Stage 1 y Day Editor: scroll vertical */}
      {(activeStage === 'stage1' || (activeStage === 'stage2' && stage2View === 'dayEditor')) && (
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
          <div style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              /* Day editor */
              <div>
                {activeDow !== null && activeDays[activeDow]?.enabled ? (
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
                  !PLAN_BUILDER_STAGE2_SILENT_ERRORS.has(state.error) && (
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
          </div>
        </div>
      )}

      {/* Stage 2 Day Map: viewport horizontal con un panel por semana */}
      {activeStage === 'stage2' && stage2View === 'dayMap' && (
        <div
          data-week-viewport="true"
          ref={weekViewportRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x',
          }}
        >
          {weekDrafts.map((w, weekIdx) => {
            const weekEnabledDows = [1, 2, 3, 4, 5, 6, 7].filter((d) => w.days[d]?.enabled)
            return (
              <div
                key={weekIdx}
                style={{
                  flex: '0 0 100%',
                  minWidth: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  overscrollBehaviorY: 'contain',
                  scrollSnapAlign: 'start',
                  padding: `16px 20px ${clipboard ? 260 : 120}px`,
                  touchAction: 'pan-y',
                }}
              >
                {weekEnabledDows.length === 0 ? (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      padding: '0px 0px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>
                      Esta semana no tiene días activos.
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0', lineHeight: 1.4 }}>
                      Activá días usando los chips de arriba.
                    </p>
                  </div>
                ) : (
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
                    {weekEnabledDows.map((dow) => {
                      const day = w.days[dow]!
                      const exerciseCount = day.exercises.filter((e) => e.exerciseId).length
                      const isClipboardSource =
                        clipboard?.sourceWeekIdx === weekIdx && clipboard?.sourceDow === dow
                      const isPendingPasteDest =
                        pendingPasteWeekIdx === weekIdx && pendingPasteDow === dow
                      return (
                        <div
                          key={dow}
                          style={{
                            width: '100%',
                            backgroundColor: '#111317',
                            borderRadius: 14,
                            border: isPendingPasteDest
                              ? '2px solid #B5F23D'
                              : isClipboardSource
                                ? '2px dashed #B5F23D'
                                : '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            transform: (isPendingPasteDest || isClipboardSource) ? 'scale(1.04)' : undefined,
                            transition: 'transform 200ms ease, box-shadow 200ms ease',
                            boxShadow: isPendingPasteDest
                              ? '0 8px 32px rgba(181,242,61,0.25)'
                              : isClipboardSource
                                ? '0 8px 32px rgba(0,0,0,0.55)'
                                : undefined,
                            ...(isClipboardSource && { position: 'relative', zIndex: 1001 }),
                            ...(isPendingPasteDest && { position: 'relative', zIndex: 1200 }),
                          }}
                        >
                          {/* Main tap area: enter day editor or paste */}
                          <button
                            type="button"
                            onClick={() => {
                              if (clipboard) {
                                if (isClipboardSource) return
                                const sourceCount = clipboard.exercises.filter((e) => e.exerciseId).length
                                setPendingPasteWeekIdx(weekIdx)
                                setPendingPasteDow(dow)
                                if (exerciseCount > 0) {
                                  setPendingAction({ type: 'pasteReplace', targetWeekIdx: weekIdx, targetDow: dow, exerciseCount })
                                } else {
                                  setPendingAction({ type: 'pastePaste', targetWeekIdx: weekIdx, targetDow: dow, sourceExerciseCount: sourceCount })
                                }
                              } else {
                                setActiveWeekIdx(weekIdx)
                                enterDayEditor(dow)
                              }
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              backgroundColor: 'transparent',
                              border: 'none',
                              padding: '10px 8px 10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              textAlign: 'left',
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
                                  color: exerciseCount > 0 ? '#FFFFFF' : '#9CA3AF',
                                  margin: '5px 0 0',
                                  lineHeight: 1.45,
                                }}
                              >
                                {exerciseCount > 0
                                  ? `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`
                                  : '+ Agregar ejercicio'}
                              </p>
                            </span>
                          </button>
                          {/* Copy icon — hidden while clipboard active or day has no exercises */}
                          {!clipboard && exerciseCount > 0 && (
                            <button
                              type="button"
                              aria-label={`Copiar ${DAY_FULL_LABELS[dow - 1]}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                copyDay(weekIdx, dow)
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44,
                                minHeight: 44,
                                padding: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6B7280',
                                flexShrink: 0,
                              }}
                            >
                              <Copy size={17} strokeWidth={2} aria-hidden />
                            </button>
                          )}
                          {/* Chevron — visual affordance only */}
                          <div
                            aria-hidden
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 44,
                              minHeight: 44,
                              flexShrink: 0,
                              color: '#F0F0F0',
                              pointerEvents: 'none',
                            }}
                          >
                            <ChevronRight size={22} strokeWidth={2.6} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {state &&
                  !state.success &&
                  'error' in state &&
                  weekIdx === activeWeekIdx &&
                  !PLAN_BUILDER_STAGE2_SILENT_ERRORS.has(state.error) && (
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
            )
          })}
        </div>
      )}

      {stage2ExitSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage2-exit-sheet-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            aria-label="Seguir editando"
            onClick={handleStage2ExitKeepEditing}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              padding: 0,
              margin: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              cursor: 'default',
            }}
          />
          <div
            data-plan-stage2-exit-sheet="true"
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#111317',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid #B5F23D',
              padding: '20px 24px calc(var(--sab, 0px) + 20px)',
              boxShadow: '0 -2px 16px rgba(181, 242, 61, 0.4)',
              animation: 'planBuilderStage2ExitSheetIn 260ms ease-out forwards',
            }}
          >
            <h2
              id="stage2-exit-sheet-title"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F0F0F0',
                margin: '0 0 10px',
                textAlign: 'center',
              }}
            >
              ¿Salir sin guardar?
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#9CA3AF',
                lineHeight: 1.5,
                margin: '0 0 20px',
                textAlign: 'center',
              }}
            >
              Tenés cambios sin guardar. Si salís los perdés.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleStage2ExitDiscard}
                style={{
                  alignSelf: 'center',
                  width: 'fit-content',
                  minHeight: 40,
                  paddingLeft: 28,
                  paddingRight: 28,
                  borderRadius: 9999,
                  border: 'none',
                  backgroundColor: '#F25252',
                  color: '#F0F0F0',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={handleStage2ExitKeepEditing}
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 9999,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'rgba(181, 242, 61, 1)',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="destructive-warning-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={cancelPendingAction}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#111317',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid #B5F23D',
              padding: '20px 24px calc(var(--sab, 0px) + 20px)',
              boxShadow: '0 -2px 16px rgba(181, 242, 61, 0.4)',
            }}
          >
            <h2
              id="destructive-warning-title"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F0F0F0',
                margin: '0 0 16px',
                textAlign: 'center',
              }}
            >
              {pendingAction.type === 'pastePaste'
                ? '¿Pegar aquí?'
                : pendingAction.type === 'pasteReplace'
                  ? '¿Reemplazar ejercicios?'
                  : '¿Eliminar ejercicios?'}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#9CA3AF',
                lineHeight: 1.5,
                margin:
                  pendingAction.type === 'pastePaste' || pendingAction.type === 'pasteReplace'
                    ? '0 0 24px'
                    : '0 0 16px',
                textAlign: 'center',
              }}
            >
              {pendingAction.type === 'toggleDay' && (
                <>
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {DAY_FULL_LABELS[pendingAction.dow - 1]}, Semana {pendingAction.weekIdx + 1}
                  </span>{' '}
                  tiene{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.count} {pendingAction.count === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>{' '}
                  que se perderán.
                </>
              )}
              {pendingAction.type === 'reduceWeeks' && (
                <>
                  Los ejercicios de{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.affectedWeeks.length === 1
                      ? `la Semana ${pendingAction.affectedWeeks[0]}`
                      : `las semanas ${pendingAction.affectedWeeks.join(', ')}`}
                  </span>{' '}
                  se perderán al reducir el plan.
                </>
              )}
              {pendingAction.type === 'pasteReplace' && (
                <>
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {DAY_FULL_LABELS[pendingAction.targetDow - 1]}
                  </span>{' '}
                  ya tiene{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.exerciseCount} {pendingAction.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>.{' '}
                  Se reemplazarán con la copia de{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {clipboard ? DAY_FULL_LABELS[clipboard.sourceDow - 1] : 'el día copiado'}
                  </span>.
                </>
              )}
              {pendingAction.type === 'pastePaste' && (
                <>
                  Se pegarán{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.sourceExerciseCount} {pendingAction.sourceExerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>{' '}
                  de{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {clipboard ? DAY_FULL_LABELS[clipboard.sourceDow - 1] : 'el día copiado'}
                  </span>{' '}
                  en{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {DAY_FULL_LABELS[pendingAction.targetDow - 1]}
                  </span>.
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={cancelPendingAction}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 22,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#F0F0F0',
                  fontSize: 15,
                  fontWeight: 500,
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
                  minHeight: 40,
                  paddingLeft: 28,
                  paddingRight: 28,
                  borderRadius: 22,
                  border: 'none',
                  backgroundColor: pendingAction.type === 'pastePaste' ? '#B5F23D' : '#F25252',
                  color: pendingAction.type === 'pastePaste' ? '#0A0A0A' : '#F0F0F0',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {pendingAction.type === 'pastePaste'
                  ? 'Pegar'
                  : pendingAction.type === 'pasteReplace'
                    ? 'Reemplazar'
                    : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clipboard && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: '#111317',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid #B5F23D',
              padding: '20px 24px calc(var(--sab, 0px) + 24px)',
              textAlign: 'center',
              pointerEvents: 'auto',
              boxShadow: '0 -2px 16px rgba(181, 242, 61, 0.4)',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: '#F0F0F0', margin: '0 0 14px' }}>
              Copiando {DAY_FULL_LABELS[clipboard.sourceDow - 1]} · Sem {clipboard.sourceWeekIdx + 1}…
            </p>
            <button
              type="button"
              onClick={() => {
                setClipboard(null)
                setPendingPasteWeekIdx(null)
                setPendingPasteDow(null)
              }}
              style={{
                height: 38,
                paddingLeft: 28,
                paddingRight: 28,
                borderRadius: 22,
                border: 'none',
                backgroundColor: '#3D4047',
                color: '#F0F0F0',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
