'use client'

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react'
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
  updateClientPlanFullAction,
  type UpdateClientPlanFullState,
} from '@/features/plans/actions/update-client-plan-full'
import { addClientPlanDayAction } from '@/features/plans/actions/add-client-plan-day'
import { deleteClientPlanDayAction } from '@/features/plans/actions/delete-client-plan-day'
import type { ClientPlanDayForEdit } from './page'
import type { ExercisePick } from '@/app/(coach)/coach/library/plans/queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import CustomSelect from '@/components/ui/custom-select'
import CoachSuccessOverlay from '@/components/ui/coach-success-overlay'

const FORM_ID = 'view-edit-client-plan-form'
const STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX = 250

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
const DAY_FULL_LABELS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

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

type ExerciseLine = {
  id: string
  dbId: string | null
  exerciseId: string
  sets: string
  repsMin: string
  repsMax: string
  durationSeconds: string
  restSeconds: string
}

type ClientDayDraft = {
  enabled: boolean
  clientPlanDayId: string | null
  hasCompletedSessions: boolean
  exercises: ExerciseLine[]
}

type ClientWeekDraft = {
  days: Record<number, ClientDayDraft>
}

type PendingAction =
  | { type: 'toggleDay'; weekIdx: number; dow: number; count: number }
  | { type: 'pasteReplace'; targetWeekIdx: number; targetDow: number; exerciseCount: number }
  | { type: 'pastePaste'; targetWeekIdx: number; targetDow: number; sourceExerciseCount: number }

type ClipboardDay = {
  sourceWeekIdx: number
  sourceDow: number
  exercises: ExerciseLine[]
}

function emptyClientDays(): Record<number, ClientDayDraft> {
  const init: Record<number, ClientDayDraft> = {}
  for (let dow = 1; dow <= 7; dow++) {
    init[dow] = {
      enabled: false,
      clientPlanDayId: null,
      hasCompletedSessions: false,
      exercises: [],
    }
  }
  return init
}

function emptyClientWeekDraft(): ClientWeekDraft {
  return { days: emptyClientDays() }
}

function buildInitialClientWeekDrafts(weeks: number, days: ClientPlanDayForEdit[]): ClientWeekDraft[] {
  const result: ClientWeekDraft[] = Array.from({ length: weeks }, () => emptyClientWeekDraft())
  for (const day of days) {
    const wi = day.weekNumber - 1
    if (wi < 0 || wi >= weeks) continue
    const dow = day.dayOfWeek
    result[wi]!.days[dow] = {
      enabled: true,
      clientPlanDayId: day.id,
      hasCompletedSessions: day.hasCompletedSessions,
      exercises: [...day.exercises]
        .sort((a, b) => a.order - b.order)
        .map((e) => ({
          id: crypto.randomUUID(),
          dbId: e.id,
          exerciseId: e.exerciseId,
          sets: String(e.sets),
          repsMin: e.repsMin != null ? String(e.repsMin) : '',
          repsMax: e.repsMax != null ? String(e.repsMax) : '',
          durationSeconds:
            e.durationSeconds != null ? String(e.durationSeconds) : '600',
          restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
        })),
    }
  }
  return result
}

function serializeForDirtyCheck(weekDrafts: ClientWeekDraft[]): string {
  return JSON.stringify(
    weekDrafts.map((w) =>
      Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((dow) => {
          const day = w.days[dow]!
          if (!day.enabled || day.hasCompletedSessions) {
            return [dow, { enabled: day.enabled, locked: day.hasCompletedSessions, id: day.clientPlanDayId }]
          }
          return [
            dow,
            {
              enabled: true,
              id: day.clientPlanDayId,
              exercises: day.exercises.map((e) => ({
                dbId: e.dbId,
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
      )
    )
  )
}

function newLine(): ExerciseLine {
  return {
    id: crypto.randomUUID(),
    dbId: null,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', minWidth: 0 }}>
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
                  <label
                    style={{ ...labelStyle, marginBottom: 6, textAlign: 'center', width: '100%' }}
                  >
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

type StaticExerciseCardProps = {
  line: ExerciseLine
  exerciseIndex: number
  isExpanded: boolean
  exerciseName: string | null
  isCardio: boolean
  onToggleExpand: () => void
}

function StaticExerciseCard({
  line,
  exerciseIndex,
  isExpanded,
  exerciseName,
  isCardio,
  onToggleExpand,
}: StaticExerciseCardProps) {
  const n = exerciseIndex + 1

  return (
    <div
      style={{
        backgroundColor: '#0D0F12',
        borderTop: '1px solid #252830',
        borderRight: '1px solid #252830',
        borderBottom: '1px solid #252830',
        borderLeft: '3px solid #B5F23D',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', minWidth: 0 }}>
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
              color="#FFFFFF"
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
          <div style={{ height: 1, backgroundColor: '#1A1D22', margin: '0 0 16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelStyle, color: '#6B7280' }}>Ejercicio</label>
              <div
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                  userSelect: 'none',
                }}
              >
                {exerciseName ?? '—'}
              </div>
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
                <label style={{ ...labelStyle, color: '#6B7280', textAlign: 'center' }}>Series</label>
                <input
                  value={line.sets}
                  readOnly
                  disabled
                  style={{ ...inputStyle, textAlign: 'center', borderRadius: 24, opacity: 0.5 }}
                />
              </div>
              {isCardio ? (
                <div>
                  <label style={{ ...labelStyle, color: '#6B7280' }}>Duración (seg)</label>
                  <input
                    value={line.durationSeconds}
                    readOnly
                    disabled
                    style={{ ...inputStyle, opacity: 0.5 }}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ ...labelStyle, color: '#6B7280', textAlign: 'center' }}>
                      Reps min
                    </label>
                    <input
                      value={line.repsMin}
                      readOnly
                      disabled
                      style={{ ...inputStyle, textAlign: 'center', borderRadius: 24, opacity: 0.5 }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: '#6B7280', textAlign: 'center' }}>
                      Reps max
                    </label>
                    <input
                      value={line.repsMax}
                      readOnly
                      disabled
                      style={{ ...inputStyle, textAlign: 'center', borderRadius: 24, opacity: 0.5 }}
                    />
                  </div>
                </>
              )}
              {line.restSeconds ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ ...labelStyle, color: '#6B7280' }}>Descanso</label>
                  <div style={{ position: 'relative', width: 100 }}>
                    <input
                      value={line.restSeconds}
                      readOnly
                      disabled
                      style={{ ...inputStyle, width: '100%', paddingRight: 34, opacity: 0.5 }}
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
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type Props = {
  clientId: string
  clientPlanId: string
  clientName: string
  planName: string
  weeks: number
  days: ClientPlanDayForEdit[]
  exercises: ExercisePick[]
  readOnly: boolean
  startDate: string | null
  endDate: string | null
  backHref: string
}

export default function ViewEditClientPlanForm({
  clientId,
  clientPlanId,
  clientName,
  planName,
  weeks,
  days,
  exercises,
  readOnly,
  startDate: _startDate,
  endDate: _endDate,
  backHref,
}: Props) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekViewportRef = useRef<HTMLDivElement>(null)
  const weekTabsOuterRef = useRef<HTMLDivElement>(null)
  const weekTabsTrackRef = useRef<HTMLDivElement>(null)
  const weekTabBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const weekIndicatorRef = useRef<HTMLDivElement>(null)
  const chipsInnerRef = useRef<HTMLDivElement>(null)

  const [weekDrafts, setWeekDrafts] = useState<ClientWeekDraft[]>(() =>
    buildInitialClientWeekDrafts(weeks, days)
  )
  const [activeWeekIdx, setActiveWeekIdx] = useState(0)
  const [stage2View, setStage2View] = useState<'dayMap' | 'dayEditor'>('dayMap')
  const [activeDow, setActiveDow] = useState<number | null>(null)
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const [exitSheetOpen, setExitSheetOpen] = useState(false)
  const [clipboard, setClipboard] = useState<ClipboardDay | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [pendingPasteWeekIdx, setPendingPasteWeekIdx] = useState<number | null>(null)
  const [pendingPasteDow, setPendingPasteDow] = useState<number | null>(null)
  const [togglingSlot, setTogglingSlot] = useState<{ weekIdx: number; dow: number } | null>(null)
  const [addDayError, setAddDayError] = useState<string | null>(null)

  const activeDayDraft =
    activeDow != null ? (weekDrafts[activeWeekIdx]?.days[activeDow] ?? null) : null
  const dayReadOnly = readOnly || (activeDayDraft?.hasCompletedSessions ?? false)

  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const initialSnapshotRef = useRef<string | null>(null)
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = serializeForDirtyCheck(weekDrafts)
  }

  const currentSnapshot = useMemo(() => serializeForDirtyCheck(weekDrafts), [weekDrafts])
  const isDirty = initialSnapshotRef.current !== currentSnapshot

  const planPayload = useMemo(() => {
    const allDays: Array<{
      clientPlanDayId: string
      exercises: Array<{
        dbId: string | null
        exerciseId: string
        order: number
        sets: number
        repsMin: number | null
        repsMax: number | null
        durationSeconds: number | null
        restSeconds: number | null
      }>
    }> = []

    for (const week of weekDrafts) {
      for (let dow = 1; dow <= 7; dow++) {
        const day = week.days[dow]!
        if (!day.enabled || !day.clientPlanDayId || day.hasCompletedSessions) continue
        allDays.push({
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
                repsMin: isCardio ? null : e.repsMin.trim() ? Number(e.repsMin) : null,
                repsMax: isCardio ? null : e.repsMax.trim() ? Number(e.repsMax) : null,
                durationSeconds: isCardio
                  ? e.durationSeconds.trim()
                    ? Number(e.durationSeconds)
                    : null
                  : null,
                restSeconds: e.restSeconds.trim() ? Number(e.restSeconds) : null,
              }
            }),
        })
      }
    }
    return JSON.stringify({ clientPlanId, days: allDays })
  }, [weekDrafts, clientPlanId, exerciseById])

  const [state, formAction, isPending] = useActionState<UpdateClientPlanFullState, FormData>(
    updateClientPlanFullAction,
    null
  )

  useEffect(() => {
    if (!state?.success) return
    initialSnapshotRef.current = currentSnapshot
    const timer = setTimeout(() => {
      router.push(`/coach/clients/${clientId}`)
    }, 2200)
    return () => clearTimeout(timer)
  }, [state, router, clientId, currentSnapshot])

  useEffect(() => {
    setAddDayError(null)
  }, [activeWeekIdx])

  const canSave = !readOnly && isDirty && !isPending

  function syncIndicator(weekIdx: number, animated: boolean) {
    const indicator = weekIndicatorRef.current
    const activeTab = weekTabBtnRefs.current[weekIdx]
    if (!indicator || !activeTab) return

    const left = activeTab.offsetLeft + 14
    const width = activeTab.offsetWidth - 28
    indicator.style.transition = animated ? 'left 220ms ease, width 220ms ease' : ''
    indicator.style.left = `${left}px`
    indicator.style.width = `${width}px`

    weekTabBtnRefs.current.forEach((tabBtn, i) => {
      if (!tabBtn) return
      const isActive = i === weekIdx
      tabBtn.style.transition = animated ? 'color 180ms ease' : ''
      tabBtn.style.color = isActive ? '#F0F0F0' : '#6B7280'
      tabBtn.style.fontWeight = isActive ? '600' : '500'
    })

    const viewport = weekViewportRef.current
    const chipsEl = chipsInnerRef.current
    if (viewport && chipsEl) {
      chipsEl.style.transition = ''
      chipsEl.style.transform = `translateX(-${weekIdx * viewport.clientWidth}px)`
    }

    const track = weekTabsTrackRef.current
    const outer = weekTabsOuterRef.current
    if (track && outer) {
      const containerWidth = outer.offsetWidth
      const btnCenter = activeTab.offsetLeft + activeTab.offsetWidth / 2
      track.style.transition = animated ? 'transform 220ms ease' : ''
      track.style.transform = `translateX(${containerWidth / 2 - btnCenter}px)`
    }
  }

  useEffect(() => {
    if (stage2View !== 'dayMap') return
    const raf = requestAnimationFrame(() => syncIndicator(activeWeekIdx, false))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage2View, weekDrafts.length])

  useEffect(() => {
    if (stage2View !== 'dayMap') return
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
      const indicator = weekIndicatorRef.current
      if (!fromBtn || !toBtn || !indicator) return

      const fromLeft = fromBtn.offsetLeft + 14
      const toLeft = toBtn.offsetLeft + 14
      const fromW = fromBtn.offsetWidth - 28
      const toW = toBtn.offsetWidth - 28
      indicator.style.transition = ''
      indicator.style.left = `${fromLeft + (toLeft - fromLeft) * t}px`
      indicator.style.width = `${fromW + (toW - fromW) * t}px`

      const chipsEl = chipsInnerRef.current
      if (chipsEl) {
        chipsEl.style.transition = ''
        chipsEl.style.transform = `translateX(-${viewport!.scrollLeft}px)`
      }

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
  }, [stage2View, weekDrafts.length])

  useEffect(() => {
    if (stage2View !== 'dayMap') return
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
  }, [stage2View, weekDrafts.length])

  useEffect(() => {
    if (stage2View !== 'dayMap') return
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * activeWeekIdx, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage2View])

  function scrollWeekTo(weekIdx: number) {
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * weekIdx, behavior: 'smooth' })
    setActiveWeekIdx(weekIdx)
    requestAnimationFrame(() => syncIndicator(weekIdx, false))
  }

  function copyDay(weekIdx: number, dow: number) {
    const day = weekDrafts[weekIdx]?.days[dow]
    if (!day?.enabled || day.hasCompletedSessions) return
    setClipboard({
      sourceWeekIdx: weekIdx,
      sourceDow: dow,
      exercises: day.exercises.map((e) => ({ ...e, id: crypto.randomUUID(), dbId: null })),
    })
  }

  function pasteDay(targetWeekIdx: number, targetDow: number) {
    if (!clipboard) return
    const newExercises = clipboard.exercises.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      dbId: null,
    }))
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[targetWeekIdx]!
      const prevDay = w.days[targetDow]!
      next[targetWeekIdx] = {
        ...w,
        days: {
          ...w.days,
          [targetDow]: {
            ...prevDay,
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

  async function removeDayFromServerAndState(weekIdx: number, dow: number) {
    const day = weekDrafts[weekIdx]?.days[dow]
    if (!day) return
    if (day.clientPlanDayId) {
      const fd = new FormData()
      fd.set('clientPlanDayId', day.clientPlanDayId)
      const res = await deleteClientPlanDayAction(null, fd)
      if (!res?.success) {
        setAddDayError(res?.error ?? 'Error al eliminar el día')
        return
      }
    }
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[weekIdx]!
      next[weekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            enabled: false,
            clientPlanDayId: null,
            hasCompletedSessions: false,
            exercises: [],
          },
        },
      }
      return next
    })
  }

  async function enableDayWithServer(weekIdx: number, dow: number) {
    if (readOnly) return
    setAddDayError(null)
    setTogglingSlot({ weekIdx, dow })
    const fd = new FormData()
    fd.set('clientPlanId', clientPlanId)
    fd.set('weekNumber', String(weekIdx + 1))
    fd.set('dayOfWeek', String(dow))
    const res = await addClientPlanDayAction(null, fd)
    setTogglingSlot(null)
    if (!res?.success) {
      setAddDayError(!res ? 'Error al agregar el día' : res.error)
      return
    }
    if (!res.dayId) {
      setAddDayError('Error al agregar el día')
      return
    }
    const newDayId = res.dayId
    setWeekDrafts((prev) => {
      const next = [...prev]
      const w = next[weekIdx]!
      next[weekIdx] = {
        ...w,
        days: {
          ...w.days,
          [dow]: {
            enabled: true,
            clientPlanDayId: newDayId,
            hasCompletedSessions: false,
            exercises: [newLine()],
          },
        },
      }
      return next
    })
  }

  function handleToggleDayClick(weekIdx: number, dow: number) {
    if (readOnly) return
    const cur = weekDrafts[weekIdx]?.days[dow]
    if (!cur || cur.hasCompletedSessions) return

    if (cur.enabled) {
      const count = cur.exercises.filter((e) => e.exerciseId).length
      if (count > 0) {
        setPendingAction({ type: 'toggleDay', weekIdx, dow, count })
        return
      }
      void removeDayFromServerAndState(weekIdx, dow)
    } else {
      void enableDayWithServer(weekIdx, dow)
    }
  }

  function confirmPendingAction() {
    if (!pendingAction) return
    if (pendingAction.type === 'toggleDay') {
      void removeDayFromServerAndState(pendingAction.weekIdx, pendingAction.dow)
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

  function enterDayEditor(dow: number) {
    setActiveDow(dow)
    setStage2View('dayEditor')
    setExpandedLineId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToDayMap() {
    setStage2View('dayMap')
    setExpandedLineId(null)
    setActiveDow(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function handleAttemptExitDayMap() {
    if (readOnly || !isDirty || isPending) {
      router.push(backHref)
      return
    }
    setExitSheetOpen(true)
  }

  function handleExitKeepEditing() {
    setExitSheetOpen(false)
  }

  function handleExitDiscardAndLeave() {
    setExitSheetOpen(false)
    router.push(backHref)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || activeDow === null) return
    const day = weekDrafts[activeWeekIdx]?.days[activeDow]
    if (!day) return
    const oldIdx = day.exercises.findIndex((e) => e.id === active.id)
    const newIdx = day.exercises.findIndex((e) => e.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    setWeekDrafts((prev) =>
      prev.map((week, wi) => {
        if (wi !== activeWeekIdx) return week
        const d = week.days[activeDow]!
        return {
          ...week,
          days: {
            ...week.days,
            [activeDow]: {
              ...d,
              exercises: arrayMove(d.exercises, oldIdx, newIdx),
            },
          },
        }
      })
    )
  }

  function updateLine(lineId: string, patch: Partial<ExerciseLine>) {
    if (dayReadOnly || activeDow === null) return
    setWeekDrafts((prev) =>
      prev.map((week, wi) => {
        if (wi !== activeWeekIdx) return week
        const d = week.days[activeDow]!
        return {
          ...week,
          days: {
            ...week.days,
            [activeDow]: {
              ...d,
              exercises: d.exercises.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
            },
          },
        }
      })
    )
  }

  function addExercise() {
    if (dayReadOnly || activeDow === null) return
    const line = newLine()
    setWeekDrafts((prev) =>
      prev.map((week, wi) => {
        if (wi !== activeWeekIdx) return week
        const d = week.days[activeDow]!
        return {
          ...week,
          days: {
            ...week.days,
            [activeDow]: {
              ...d,
              exercises: [...d.exercises, line],
            },
          },
        }
      })
    )
    setExpandedLineId(line.id)
  }

  function removeExercise(lineId: string) {
    if (dayReadOnly || activeDow === null) return
    setWeekDrafts((prev) =>
      prev.map((week, wi) => {
        if (wi !== activeWeekIdx) return week
        const d = week.days[activeDow]!
        return {
          ...week,
          days: {
            ...week.days,
            [activeDow]: {
              ...d,
              exercises: d.exercises.filter((l) => l.id !== lineId),
            },
          },
        }
      })
    )
    if (expandedLineId === lineId) setExpandedLineId(null)
  }

  const saveButton = !readOnly ? (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canSave}
      aria-label={
        isPending
          ? 'Guardando…'
          : !isDirty
            ? 'Sin cambios para guardar'
            : 'Guardar cambios'
      }
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
        backgroundColor: canSave ? '#B5F23D' : '#3D4047',
        cursor: canSave ? 'pointer' : 'not-allowed',
      }}
    >
      {isPending ? (
        <Loader2
          size={19}
          color="#0A0A0A"
          aria-hidden
          style={{ animation: 'vecpfSpin 0.75s linear infinite' }}
        />
      ) : (
        <Check size={21} strokeWidth={2.5} color={canSave ? '#0A0A0A' : '#6B7280'} aria-hidden />
      )}
    </button>
  ) : undefined

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
        [data-client-plan-week-viewport='true']::-webkit-scrollbar,
        [data-client-plan-week-tabs-track='true']::-webkit-scrollbar {
          display: none;
          width: 0 !important;
          height: 0 !important;
        }
        [data-client-plan-week-tabs-track='true'] button {
          color: #6B7280;
          font-weight: 500;
        }
        @keyframes vecpfSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {state?.success && (
        <CoachSuccessOverlay
          title="¡Plan actualizado!"
          subtitle={planName}
          hint="Volviendo al perfil del cliente..."
        />
      )}

      {stage2View === 'dayEditor' && activeDow !== null && activeDayDraft ? (
        <FlowHeaderConfig
          title={`Sem ${activeWeekIdx + 1} · ${DAY_FULL_LABELS[activeDow - 1]}`}
          fallbackHref={backHref}
          onBack={goToDayMap}
          rightSlot={saveButton}
        />
      ) : (
        <FlowHeaderConfig
          title={planName}
          subtitle={clientName}
          fallbackHref={backHref}
          onBack={handleAttemptExitDayMap}
          rightSlot={saveButton}
        />
      )}

      {stage2View === 'dayMap' && (
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
                data-client-plan-week-tabs-track="true"
                style={{
                  display: 'flex',
                  position: 'relative',
                  paddingBottom: 6,
                  paddingLeft: 20,
                  paddingRight: 20,
                  willChange: 'transform',
                }}
              >
                {weekDrafts.map((_, i) => (
                  <button
                    key={i}
                    ref={(node) => {
                      weekTabBtnRefs.current[i] = node
                    }}
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
                    Sem {i + 1}
                  </button>
                ))}
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

          <div
            style={{
              overflow: 'clip' as CSSProperties['overflow'],
              marginLeft: -20,
              marginRight: -20,
            }}
          >
            <div ref={chipsInnerRef} style={{ display: 'flex', willChange: 'transform' }}>
              {weekDrafts.map((w, weekIdx) => (
                <div
                  key={weekIdx}
                  style={{ flex: '0 0 100%', padding: '10px 20px 14px', boxSizing: 'border-box' }}
                >
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between' }}>
                    {DAY_LABELS.map((lbl, idx) => {
                      const dow = idx + 1
                      const on = w.days[dow]?.enabled
                      const locked = w.days[dow]?.hasCompletedSessions
                      const toggling =
                        togglingSlot?.weekIdx === weekIdx && togglingSlot.dow === dow

                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() => {
                            if (readOnly || locked) return
                            handleToggleDayClick(weekIdx, dow)
                          }}
                          aria-pressed={on}
                          style={{
                            flex: '1 0 0',
                            height: 34,
                            borderRadius: 9999,
                            border: `1.5px solid ${on ? '#B5F23D' : '#2A2D34'}`,
                            backgroundColor: on ? '#B5F23D' : 'transparent',
                            color: on ? '#0A0A0A' : readOnly ? '#4B5563' : '#6B7280',
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: readOnly || locked ? 'default' : 'pointer',
                            padding: 0,
                          }}
                        >
                          {toggling ? (
                            <Loader2
                              size={12}
                              aria-hidden
                              style={{ animation: 'vecpfSpin 0.75s linear infinite' }}
                            />
                          ) : (
                            lbl
                          )}
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

      <form id={FORM_ID} action={formAction} style={{ display: 'none' }}>
        <input type="hidden" name="planPayload" value={planPayload} readOnly />
      </form>

      {stage2View === 'dayMap' && (
        <div
          data-client-plan-week-viewport="true"
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
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>
                      Esta semana no tiene días activos.
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0', lineHeight: 1.4 }}>
                      {readOnly
                        ? 'No hay días asignados para esta semana.'
                        : 'Activá días usando los chips de arriba.'}
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
                      const isLocked = day.hasCompletedSessions && !readOnly

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
                                : isLocked
                                  ? '1px solid rgba(251, 191, 36, 0.2)'
                                  : '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            transform:
                              isPendingPasteDest || isClipboardSource ? 'scale(1.04)' : undefined,
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
                          <button
                            type="button"
                            onClick={() => {
                              if (readOnly) {
                                setActiveWeekIdx(weekIdx)
                                enterDayEditor(dow)
                                return
                              }
                              if (clipboard) {
                                if (isClipboardSource) return
                                if (isLocked) return
                                const sourceCount = clipboard.exercises.filter(
                                  (e) => e.exerciseId
                                ).length
                                setPendingPasteWeekIdx(weekIdx)
                                setPendingPasteDow(dow)
                                if (exerciseCount > 0) {
                                  setPendingAction({
                                    type: 'pasteReplace',
                                    targetWeekIdx: weekIdx,
                                    targetDow: dow,
                                    exerciseCount,
                                  })
                                } else {
                                  setPendingAction({
                                    type: 'pastePaste',
                                    targetWeekIdx: weekIdx,
                                    targetDow: dow,
                                    sourceExerciseCount: sourceCount,
                                  })
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
                                  color: isLocked ? '#FBB724' : '#B5F23D',
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
                                  : 'Sin ejercicios'}
                                {isLocked ? ' · Sesión completada' : ''}
                              </p>
                            </span>
                          </button>
                          {!clipboard && exerciseCount > 0 && !readOnly && !isLocked && (
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
                            {isLocked ? (
                              <Lock size={18} color="#FBB724" />
                            ) : (
                              <ChevronRight size={22} strokeWidth={2.6} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {addDayError && weekIdx === activeWeekIdx && (
                  <div
                    role="alert"
                    style={{
                      width: '100%',
                      maxWidth: STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX,
                      margin: '16px auto 0',
                      backgroundColor: 'rgba(242, 82, 82, 0.08)',
                      border: '1px solid rgba(242, 82, 82, 0.25)',
                      borderRadius: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45, margin: 0 }}>
                      {addDayError}
                    </p>
                  </div>
                )}

                {state && !state.success && 'error' in state && weekIdx === activeWeekIdx && (
                  <div
                    role="alert"
                    style={{
                      width: '100%',
                      maxWidth: STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX,
                      margin: '16px auto 0',
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

      {stage2View === 'dayEditor' && activeDow !== null && activeDayDraft && (
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
            <div>
              {activeDayDraft.hasCompletedSessions && !readOnly && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    marginBottom: 16,
                  }}
                >
                  <Lock size={16} color="#FBB724" aria-hidden />
                  <p style={{ fontSize: 13, color: '#FBB724', margin: 0, lineHeight: 1.4 }}>
                    Este día tiene sesiones completadas y no puede editarse.
                  </p>
                </div>
              )}

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

              {dayReadOnly ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeDayDraft.exercises.length === 0 ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: '#6B7280',
                        textAlign: 'center',
                        padding: '20px 0',
                        margin: 0,
                      }}
                    >
                      Sin ejercicios asignados.
                    </p>
                  ) : (
                    activeDayDraft.exercises.map((line, exerciseIndex) => {
                      const isCardio = exerciseById.get(line.exerciseId)?.type === 'cardio'
                      const isExpanded = expandedLineId === line.id
                      const exerciseName = exerciseById.get(line.exerciseId)?.name ?? null
                      return (
                        <StaticExerciseCard
                          key={line.id}
                          line={line}
                          exerciseIndex={exerciseIndex}
                          isExpanded={isExpanded}
                          exerciseName={exerciseName}
                          isCardio={isCardio}
                          onToggleExpand={() =>
                            setExpandedLineId(isExpanded ? null : line.id)
                          }
                        />
                      )
                    })
                  )}
                </div>
              ) : (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeDayDraft.exercises.map((e) => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeDayDraft.exercises.map((line, exerciseIndex) => {
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
                              onToggleExpand={() =>
                                setExpandedLineId(isExpanded ? null : line.id)
                              }
                              onRemove={() => removeExercise(line.id)}
                              onUpdateLine={(patch) => updateLine(line.id, patch)}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button
                    type="button"
                    onClick={addExercise}
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
                </>
              )}
            </div>
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
                <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45, margin: 0 }}>
                  {state.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {stage2View === 'dayMap' && !readOnly && exitSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-plan-exit-warning-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={handleExitKeepEditing}
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
              id="client-plan-exit-warning-title"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F0F0F0',
                margin: '0 0 12px',
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
                margin: '0 0 24px',
                textAlign: 'center',
              }}
            >
              Tenés cambios sin guardar. Si salís los perdés.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={handleExitDiscardAndLeave}
                style={{
                  alignSelf: 'center',
                  width: 'fit-content',
                  minHeight: 48,
                  paddingLeft: 28,
                  paddingRight: 28,
                  borderRadius: 9999,
                  border: 'none',
                  backgroundColor: '#F25252',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={handleExitKeepEditing}
                style={{
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
          aria-labelledby="client-destructive-warning-title"
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
              id="client-destructive-warning-title"
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
              {pendingAction.type === 'pasteReplace' && (
                <>
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {DAY_FULL_LABELS[pendingAction.targetDow - 1]}
                  </span>{' '}
                  ya tiene{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.exerciseCount}{' '}
                    {pendingAction.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                  . Se reemplazarán con la copia de{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {clipboard ? DAY_FULL_LABELS[clipboard.sourceDow - 1] : 'el día copiado'}
                  </span>
                  .
                </>
              )}
              {pendingAction.type === 'pastePaste' && (
                <>
                  Se pegarán{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {pendingAction.sourceExerciseCount}{' '}
                    {pendingAction.sourceExerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>{' '}
                  de{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {clipboard ? DAY_FULL_LABELS[clipboard.sourceDow - 1] : 'el día copiado'}
                  </span>{' '}
                  en{' '}
                  <span style={{ color: '#F0F0F0', fontWeight: 700 }}>
                    {DAY_FULL_LABELS[pendingAction.targetDow - 1]}
                  </span>
                  .
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
                  backgroundColor:
                    pendingAction.type === 'pastePaste' ? '#B5F23D' : '#F25252',
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
