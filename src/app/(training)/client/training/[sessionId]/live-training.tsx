'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Check } from 'lucide-react'
import { completeSetAction } from '@/features/training/actions/complete-set'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import { updateSetAction } from '@/features/training/actions/update-set'
import VideoModal from '@/components/ui/video-modal'
import type { LiveExercise, LiveSessionData } from '@/features/training/types'
import { SAFE_HEADER_PADDING_TOP_COMPACT } from '@/lib/ui/safe-area'

type SetInputs = { weight: string; duration: string }

type FlatSet = {
  exerciseIndex: number
  totalExercises: number
  exerciseName: string
  muscleGroup: string | null
  videoUrl: string | null
  type: 'strength' | 'cardio'
  setNumber: number
  totalSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  clientPlanDayExerciseId: string
}

function makeKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

function buildFlatSets(exercises: LiveExercise[]): FlatSet[] {
  const totalExercises = exercises.length
  return exercises.flatMap((ex, exerciseIndex) =>
    Array.from({ length: ex.plannedSets }, (_, i) => {
      const setNumber = i + 1
      return {
        exerciseIndex,
        totalExercises,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup?.trim() ? ex.muscleGroup : null,
        videoUrl: ex.videoUrl,
        type: ex.type,
        setNumber,
        totalSets: ex.plannedSets,
        plannedReps: ex.plannedReps,
        plannedDurationSeconds: ex.plannedDurationSeconds,
        restSeconds: ex.restSeconds,
        clientPlanDayExerciseId: ex.clientPlanDayExerciseId,
      }
    })
  )
}

function firstIncompleteFlatIndex(
  flatSets: FlatSet[],
  completed: Set<string>
): number {
  for (let i = 0; i < flatSets.length; i++) {
    const fs = flatSets[i]!
    const key = makeKey(fs.clientPlanDayExerciseId, fs.setNumber)
    if (!completed.has(key)) return i
  }
  return Math.max(0, flatSets.length - 1)
}

/** Cuánto tiempo se muestra el tick grande antes de pasar a la siguiente serie */
const CELEBRATION_DISPLAY_MS = 920

/** Design tokens — live training shell */
const LT = {
  bg: '#0A0A0A',
  bgLift: 'linear-gradient(180deg, #12151C 0%, #0C0D10 48%, #0A0A0A 100%)',
  border: '#1F2227',
  borderStrong: '#2A2D34',
  borderGlow: 'rgba(181, 242, 61, 0.22)',
  lime: '#B5F23D',
  limeSoft: 'rgba(181, 242, 61, 0.12)',
  limeGlow: 'rgba(181, 242, 61, 0.35)',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
  track: '#1A1D24',
  /** Botón video: acento frío, distinto del lima de acción principal */
  videoBg: 'rgba(56, 189, 248, 0.12)',
  videoBorder: 'rgba(56, 189, 248, 0.5)',
  videoIcon: '#7DD3FC',
  videoGlow: 'rgba(56, 189, 248, 0.25)',
} as const

export default function LiveTraining({ session }: { session: LiveSessionData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFinished, setIsFinished] = useState(false)
  const [videoUrlOpen, setVideoUrlOpen] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [showSetCelebration, setShowSetCelebration] = useState(false)
  const [inputFocusIdx, setInputFocusIdx] = useState<number | null>(null)
  const pendingScrollAfterCelebrationRef = useRef<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const didInitialScroll = useRef(false)
  const lastSessionIdRef = useRef<string | null>(null)

  const flatSets = useMemo(() => buildFlatSets(session.exercises), [session.exercises])

  const [localCompleted, setLocalCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const ex of session.exercises) {
      for (const set of ex.loggedSets) {
        if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
      }
    }
    return s
  })

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

  const localCompletedRef = useRef(localCompleted)
  localCompletedRef.current = localCompleted

  const frontierIndex = useMemo(
    () => firstIncompleteFlatIndex(flatSets, localCompleted),
    [flatSets, localCompleted]
  )

  const completedCount = useMemo(() => {
    let n = 0
    for (const fs of flatSets) {
      if (localCompleted.has(makeKey(fs.clientPlanDayExerciseId, fs.setNumber))) n++
    }
    return n
  }, [flatSets, localCompleted])

  const allSetsDone = flatSets.length > 0 && completedCount === flatSets.length

  // Hydrate + initial horizontal scroll when session or plan shape changes (not on every set completion).
  useEffect(() => {
    if (flatSets.length === 0) return

    let completedForScroll: Set<string> = localCompletedRef.current
    if (lastSessionIdRef.current !== session.sessionId) {
      lastSessionIdRef.current = session.sessionId
      const s = new Set<string>()
      const m = new Map<string, SetInputs>()
      for (const ex of session.exercises) {
        for (const set of ex.loggedSets) {
          if (set.completed) s.add(makeKey(ex.clientPlanDayExerciseId, set.setNumber))
          m.set(makeKey(ex.clientPlanDayExerciseId, set.setNumber), {
            weight: set.weightKg != null ? String(set.weightKg) : '',
            duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
          })
        }
      }
      setLocalCompleted(s)
      setInputs(m)
      setIsFinished(false)
      setEditingKey(null)
      setShowSetCelebration(false)
      setInputFocusIdx(null)
      pendingScrollAfterCelebrationRef.current = null
      setVideoUrlOpen(null)
      didInitialScroll.current = false
      localCompletedRef.current = s
      completedForScroll = s
    }

    const el = scrollRef.current
    if (!el) return

    const applyInitialScroll = () => {
      if (didInitialScroll.current) return
      const w = el.clientWidth
      if (w <= 0) return
      const targetIdx = firstIncompleteFlatIndex(flatSets, completedForScroll)
      el.scrollTo({ left: targetIdx * w, behavior: 'auto' })
      didInitialScroll.current = true
    }

    applyInitialScroll()
    const ro = new ResizeObserver(() => applyInitialScroll())
    ro.observe(el)
    const id = requestAnimationFrame(() => applyInitialScroll())
    return () => {
      ro.disconnect()
      cancelAnimationFrame(id)
    }
  }, [session.sessionId, flatSets])

  useEffect(() => {
    if (!showSetCelebration) return
    const id = window.setTimeout(() => setShowSetCelebration(false), CELEBRATION_DISPLAY_MS)
    return () => window.clearTimeout(id)
  }, [showSetCelebration])

  const onCelebrationExitComplete = useCallback(() => {
    const next = pendingScrollAfterCelebrationRef.current
    pendingScrollAfterCelebrationRef.current = null
    if (next == null) return
    const el = scrollRef.current
    const w = el?.clientWidth ?? 0
    if (el && w > 0) {
      requestAnimationFrame(() => {
        el.scrollTo({ left: next * w, behavior: 'smooth' })
      })
    }
  }, [])

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

  function handleCompleteSet(flatIndex: number) {
    const fs = flatSets[flatIndex]
    if (!fs) return
    if (flatIndex !== frontierIndex) return

    const key = makeKey(fs.clientPlanDayExerciseId, fs.setNumber)
    const inp = getInput(fs.clientPlanDayExerciseId, fs.setNumber)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', fs.clientPlanDayExerciseId)
      formData.set('setNumber', String(fs.setNumber))
      if (fs.type === 'strength' && inp.weight) formData.set('weightKg', inp.weight)
      if (fs.type === 'cardio' && inp.duration) formData.set('durationSeconds', inp.duration)

      const result = await completeSetAction(formData)
      if (result.error) return

      setLocalCompleted((prev) => new Set([...prev, key]))
      const next = flatIndex + 1
      pendingScrollAfterCelebrationRef.current = next < flatSets.length ? next : null
      setShowSetCelebration(true)
    })
  }

  function handleFinish() {
    startTransition(async () => {
      await completeSessionAction(session.sessionId)
      setIsFinished(true)
    })
  }

  function handleUpdateSet(clientPlanDayExerciseId: string, setNumber: number) {
    const inp = getInput(clientPlanDayExerciseId, setNumber)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('sessionId', session.sessionId)
      formData.set('clientPlanDayExerciseId', clientPlanDayExerciseId)
      formData.set('setNumber', String(setNumber))
      const ex = session.exercises.find((e) => e.clientPlanDayExerciseId === clientPlanDayExerciseId)
      if (ex?.type === 'strength') formData.set('weightKg', inp.weight)
      if (ex?.type === 'cardio') formData.set('durationSeconds', inp.duration)
      const result = await updateSetAction(formData)
      if (result.success) setEditingKey(null)
    })
  }

  if (session.exercises.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 40,
          paddingRight: 40,
          paddingBottom: 40,
          paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 15, color: '#9CA3AF' }}>No hay ejercicios en esta sesión.</p>
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1F2227',
            border: '1px solid #2A2D34',
            borderRadius: 12,
            color: '#F0F0F0',
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 40,
          paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
          gap: 20,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 52 }}>🏆</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F0' }}>¡Entrenamiento completado!</p>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Excelente trabajo. Seguí así.</p>
        <button
          type="button"
          onClick={() => router.push('/client/dashboard')}
          style={{
            marginTop: 8,
            padding: '14px 32px',
            backgroundColor: '#B5F23D',
            color: '#0A0A0A',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const progressPct = flatSets.length ? (completedCount / flatSets.length) * 100 : 0

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: LT.bg,
      }}
    >
      <AnimatePresence onExitComplete={onCelebrationExitComplete}>
        {showSetCelebration ? (
          <motion.div
            key="set-celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              backgroundColor: 'rgba(10,10,10,0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
            }}
          >
            <motion.div
              initial={{ scale: 0.28, opacity: 0, rotate: -12 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
                transition: { type: 'spring', stiffness: 380, damping: 16 },
              }}
              exit={{
                scale: 1.35,
                opacity: 0,
                transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              }}
              style={{
                width: 152,
                height: 152,
                borderRadius: '50%',
                background: `linear-gradient(145deg, #D4FF6A 0%, ${LT.lime} 45%, #9FD82E 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
              }}
            >
              <Check size={80} strokeWidth={3.2} color="#0A0A0A" aria-hidden />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header
        style={{
          flexShrink: 0,
          background: LT.bgLift,
          borderBottom: `1px solid ${LT.border}`,
          paddingTop: SAFE_HEADER_PADDING_TOP_COMPACT,
          paddingLeft: 18,
          paddingRight: 18,
          paddingBottom: 18,
        }}
      >
        <div style={{ position: 'relative', minHeight: 44 }}>
          <button
            type="button"
            onClick={() => router.push('/client/dashboard')}
            aria-label="Volver al inicio"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 44,
              height: 44,
              borderRadius: 14,
              border: `1px solid ${LT.borderStrong}`,
              backgroundColor: 'rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: LT.secondary,
              zIndex: 1,
            }}
          >
            <ChevronLeft size={24} strokeWidth={2.25} />
          </button>
          <div
            style={{
              textAlign: 'center',
              paddingLeft: 52,
              paddingRight: 52,
              boxSizing: 'border-box',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: LT.muted,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Entreno en vivo
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: LT.muted }}>Series completadas</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: LT.lime }}>{Math.round(progressPct)}%</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              backgroundColor: LT.track,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.45)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                borderRadius: 9999,
                background: `linear-gradient(90deg, #9FD82E 0%, ${LT.lime} 52%, #D4FF6A 100%)`,
                boxShadow: `0 0 18px ${LT.limeGlow}`,
                transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: LT.muted, marginTop: 8, fontWeight: 500 }}>
            {completedCount} de {flatSets.length} series
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
      >
        {flatSets.map((fs, idx) => {
          const key = makeKey(fs.clientPlanDayExerciseId, fs.setNumber)
          const isDone = localCompleted.has(key)
          const inp = getInput(fs.clientPlanDayExerciseId, fs.setNumber)
          const isPast = isDone
          const isFuture = !isDone && idx > frontierIndex
          const isActive = !isDone && idx === frontierIndex
          const editing = editingKey === key
          const inputFocused = inputFocusIdx === idx

          const inputShell = (active: boolean, disabled: boolean): CSSProperties => ({
            width: 'min(100%, 180px)',
            padding: '18px 20px',
            backgroundColor: '#0D0F14',
            border: `1.5px solid ${active ? LT.lime : LT.borderStrong}`,
            borderRadius: 16,
            color: LT.text,
            fontSize: 28,
            fontWeight: 800,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.45 : 1,
            transition: 'border-color 0.25s ease, box-shadow 0.3s ease',
            boxShadow: active
              ? inputFocused
                ? `0 0 0 2px ${LT.limeSoft}, 0 0 14px rgba(181,242,61,0.2), inset 0 2px 10px rgba(0,0,0,0.4)`
                : `0 0 0 2px ${LT.limeSoft}, inset 0 2px 8px rgba(0,0,0,0.35)`
              : 'inset 0 2px 8px rgba(0,0,0,0.35)',
          })

          return (
            <div
              key={`${fs.clientPlanDayExerciseId}-${fs.setNumber}`}
              style={{
                flex: '0 0 100%',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
                padding: '12px 16px calc(28px + env(safe-area-inset-bottom, 0px))',
                opacity: isFuture ? 0.44 : 1,
                transition: 'opacity 0.35s ease',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  maxWidth: 440,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  boxSizing: 'border-box',
                  backgroundColor: 'transparent',
                  padding: '12px 20px 8px',
                  border: 'none',
                  boxShadow: 'none',
                  transition: 'opacity 0.25s ease',
                }}
              >
                {/* — Bloque centrado; nombre; debajo video como texto — */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: LT.muted,
                        textTransform: 'uppercase',
                      }}
                    >
                      Bloque {fs.exerciseIndex + 1} · {fs.totalExercises}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '14px 0 0',
                      fontSize: 26,
                      fontWeight: 800,
                      color: LT.text,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      width: '100%',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {fs.exerciseName}
                  </p>
                  {fs.videoUrl ? (
                    <button
                      type="button"
                      onClick={() => setVideoUrlOpen(fs.videoUrl)}
                      style={{
                        margin: '8px 0 0',
                        padding: '8px 0',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        color: LT.videoIcon,
                        lineHeight: 1.35,
                        letterSpacing: '0.01em',
                        textAlign: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      Ver video del ejercicio
                    </button>
                  ) : null}
                </div>

                {/* — Indicador de serie — */}
                <div
                  style={{
                    marginTop: 20,
                    width: '100%',
                    maxWidth: 340,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    padding: '10px 24px 16px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 22px',
                      borderRadius: 9999,
                      border: `1px solid ${LT.borderStrong}`,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.22em',
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                      }}
                    >
                      Serie
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 26,
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                      rowGap: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 54,
                        fontWeight: 900,
                        color: '#FFFFFF',
                        lineHeight: 0.95,
                        letterSpacing: '-0.04em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fs.setNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: LT.muted,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        paddingLeft: 2,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      /{fs.totalSets}
                    </span>
                  </div>
                </div>

                {/* — Input / estados — separado del círculo de serie — */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    marginTop: 24,
                    gap: 12,
                  }}
                >
                  {isFuture ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '18px 16px',
                        borderRadius: 14,
                        border: `1px dashed ${LT.borderStrong}`,
                        backgroundColor: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: LT.muted, margin: 0 }}>Próximamente</p>
                      <p style={{ fontSize: 12, color: LT.muted, margin: '8px 0 0', lineHeight: 1.4 }}>
                        Completá las series anteriores para desbloquear esta.
                      </p>
                    </div>
                  ) : null}

                  {isPast && !editing ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        padding: '8px 0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 22px',
                          borderRadius: 16,
                          backgroundColor: LT.limeSoft,
                          border: `1px solid ${LT.borderGlow}`,
                        }}
                      >
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9999,
                            backgroundColor: LT.lime,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0A0A0A',
                          }}
                        >
                          <Check size={20} strokeWidth={3} />
                        </span>
                        <span style={{ fontSize: 20, color: LT.text, fontWeight: 800 }}>
                          {fs.type === 'strength'
                            ? `${inp.weight || '—'} kg`
                            : `${inp.duration || '—'} seg`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingKey(key)}
                        style={{
                          background: 'none',
                          border: `1px solid ${LT.borderStrong}`,
                          borderRadius: 9999,
                          cursor: 'pointer',
                          color: LT.secondary,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '8px 18px',
                        }}
                      >
                        Editar serie
                      </button>
                    </div>
                  ) : null}

                  {isPast && editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {fs.type === 'strength' ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="kg"
                            value={inp.weight}
                            onChange={(e) =>
                              updateInput(fs.clientPlanDayExerciseId, fs.setNumber, { weight: e.target.value })
                            }
                            style={inputShell(true, false)}
                          />
                        ) : (
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="seg"
                            value={inp.duration}
                            onChange={(e) =>
                              updateInput(fs.clientPlanDayExerciseId, fs.setNumber, {
                                duration: e.target.value,
                              })
                            }
                            style={inputShell(true, false)}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateSet(fs.clientPlanDayExerciseId, fs.setNumber)}
                          disabled={isPending}
                          style={{
                            flex: 1,
                            padding: '16px 14px',
                            backgroundColor: isPending ? 'rgba(181,242,61,0.4)' : LT.lime,
                            border: 'none',
                            borderRadius: 14,
                            color: '#0A0A0A',
                            fontSize: 15,
                            fontWeight: 800,
                            cursor: isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isPending ? '...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          style={{
                            padding: '16px 18px',
                            backgroundColor: '#1A1D22',
                            border: `1px solid ${LT.borderStrong}`,
                            borderRadius: 14,
                            color: LT.secondary,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                      <motion.div
                        style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                        animate={
                          inputFocused
                            ? { scale: 1.03, y: -2 }
                            : { scale: 1, y: 0 }
                        }
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                      >
                        {fs.type === 'strength' ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="kg"
                            value={inp.weight}
                            onChange={(e) =>
                              updateInput(fs.clientPlanDayExerciseId, fs.setNumber, { weight: e.target.value })
                            }
                            onFocus={() => setInputFocusIdx(idx)}
                            onBlur={() => setInputFocusIdx((v) => (v === idx ? null : v))}
                            style={inputShell(true, false)}
                          />
                        ) : (
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="seg"
                            value={inp.duration}
                            onChange={(e) =>
                              updateInput(fs.clientPlanDayExerciseId, fs.setNumber, {
                                duration: e.target.value,
                              })
                            }
                            onFocus={() => setInputFocusIdx(idx)}
                            onBlur={() => setInputFocusIdx((v) => (v === idx ? null : v))}
                            style={inputShell(true, false)}
                          />
                        )}
                      </motion.div>
                      <motion.button
                        type="button"
                        onClick={() => handleCompleteSet(idx)}
                        disabled={isPending || showSetCelebration}
                        aria-label="Hecho — registrar serie"
                        whileHover={
                          isPending || showSetCelebration
                            ? undefined
                            : { scale: 1.04, transition: { type: 'spring', stiffness: 450, damping: 20 } }
                        }
                        whileTap={
                          isPending || showSetCelebration
                            ? undefined
                            : { scale: 0.88, transition: { type: 'spring', stiffness: 550, damping: 22 } }
                        }
                        animate={
                          isPending || showSetCelebration
                            ? { scale: 1 }
                            : {
                                scale: [1, 1.1, 1, 1.06, 1],
                              }
                        }
                        transition={
                          isPending || showSetCelebration
                            ? { duration: 0.2 }
                            : {
                                scale: {
                                  duration: 1.2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                  times: [0, 0.18, 0.32, 0.52, 1],
                                },
                              }
                        }
                        style={{
                          width: 84,
                          height: 84,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(180deg, ${LT.lime} 0%, #9FD82E 100%)`,
                          border: 'none',
                          borderRadius: 9999,
                          color: '#0A0A0A',
                          cursor: isPending || showSetCelebration ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          opacity: isPending || showSetCelebration ? 0.65 : 1,
                          boxShadow: '0 12px 28px rgba(0,0,0,0.38)',
                        }}
                      >
                        <Check size={36} strokeWidth={3} />
                      </motion.button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {allSetsDone && (
        <div
          style={{
            flexShrink: 0,
            padding: '14px 20px calc(18px + env(safe-area-inset-bottom, 0px))',
            borderTop: `1px solid ${LT.border}`,
            background: 'linear-gradient(0deg, rgba(181,242,61,0.06) 0%, transparent 100%), #0A0A0A',
          }}
        >
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            style={{
              width: '100%',
              padding: '18px 20px',
              background: isPending
                ? 'rgba(181,242,61,0.35)'
                : `linear-gradient(180deg, ${LT.lime} 0%, #9FD82E 100%)`,
              border: 'none',
              borderRadius: 16,
              color: '#0A0A0A',
              fontWeight: 900,
              fontSize: 17,
              letterSpacing: '0.04em',
              cursor: isPending ? 'not-allowed' : 'pointer',
              boxShadow: isPending ? 'none' : '0 14px 36px rgba(0,0,0,0.45)',
            }}
          >
            {isPending ? 'Guardando...' : 'Finalizar entrenamiento'}
          </button>
        </div>
      )}

      {videoUrlOpen && <VideoModal url={videoUrlOpen} onClose={() => setVideoUrlOpen(null)} />}
    </div>
  )
}
