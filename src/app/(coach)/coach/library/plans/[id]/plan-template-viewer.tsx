'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import type { PlanDetailExercise, PlanDetailFull } from '../queries'

const STAGE2_DAY_MAP_CARD_MAX_WIDTH_PX = 250

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
const DAY_FULL_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
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

const stage1ReadonlyTextStyle: CSSProperties = {
  width: '100%',
  minHeight: 44,
  background: 'none',
  border: 'none',
  outline: 'none',
  color: '#F0F0F0',
  fontSize: 15,
  fontFamily: 'inherit',
  padding: '10px 14px',
  boxSizing: 'border-box',
  lineHeight: 1.35,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const inputLikeReadonly: CSSProperties = {
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
  display: 'flex',
  alignItems: 'center',
}

function ReadonlyField({
  label,
  children,
  alignCenter,
}: {
  label: ReactNode
  children: ReactNode
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

function buildSummary(ex: PlanDetailExercise): string {
  const parts: string[] = [`${ex.sets} series`]
  if (ex.type === 'cardio') {
    if (ex.durationSeconds) parts.push(`${ex.durationSeconds}s`)
  } else {
    if (ex.repsMin != null && ex.repsMax != null && ex.repsMin !== ex.repsMax) {
      parts.push(`${ex.repsMin}–${ex.repsMax} reps`)
    } else if (ex.repsMin != null) {
      parts.push(`${ex.repsMin} reps`)
    }
    if (ex.restSeconds) parts.push(`${ex.restSeconds}s rest`)
  }
  return parts.join(' · ')
}

type ExerciseReadonlyCardProps = {
  ex: PlanDetailExercise
  index: number
  isExpanded: boolean
  onToggle: () => void
}

function ExerciseReadonlyCard({ ex, index, isExpanded, onToggle }: ExerciseReadonlyCardProps) {
  const n = index + 1
  const isCardio = ex.type === 'cardio'

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
          onClick={onToggle}
          aria-expanded={isExpanded}
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
              {ex.name}
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
                {buildSummary(ex)}
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
          <div style={{ height: 1, backgroundColor: '#1A1D22', margin: '10px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 6, paddingLeft: 10 }}>Ejercicio</label>
              <div style={{ ...inputLikeReadonly, borderRadius: 10 }}>{ex.name}</div>
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
                <div style={{ ...inputLikeReadonly, justifyContent: 'center', borderRadius: 24 }}>{ex.sets}</div>
              </div>
              {isCardio ? (
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>Duración</label>
                  <div style={{ position: 'relative', width: 80 }}>
                    <div
                      style={{
                        ...inputLikeReadonly,
                        justifyContent: 'center',
                        borderRadius: 24,
                        paddingRight: 34,
                      }}
                    >
                      {ex.durationSeconds ?? '—'}
                    </div>
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
              ) : (
                <>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>Reps min</label>
                    <div style={{ ...inputLikeReadonly, justifyContent: 'center', borderRadius: 24 }}>
                      {ex.repsMin ?? '—'}
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6, textAlign: 'center' }}>Reps max</label>
                    <div style={{ ...inputLikeReadonly, justifyContent: 'center', borderRadius: 24 }}>
                      {ex.repsMax ?? '—'}
                    </div>
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
                    <div
                      style={{
                        ...inputLikeReadonly,
                        paddingRight: 34,
                        borderRadius: 10,
                      }}
                    >
                      {ex.restSeconds != null && ex.restSeconds !== 0 ? ex.restSeconds : '—'}
                    </div>
                    {ex.restSeconds != null && ex.restSeconds !== 0 ? (
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
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function dowHasTraining(week: PlanDetailFull['planWeeks'][0], dow: number): boolean {
  return (week?.days ?? []).some((d) => d.dayOfWeek === dow)
}

type ViewMode = 'dayMap' | 'dayEditor'

export default function PlanTemplateViewer({ plan }: { plan: PlanDetailFull }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekTabsOuterRef = useRef<HTMLDivElement>(null)
  const weekViewportRef = useRef<HTMLDivElement>(null)
  const weekTabsTrackRef = useRef<HTMLDivElement>(null)
  const weekTabBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const weekIndicatorRef = useRef<HTMLDivElement>(null)
  const chipsInnerRef = useRef<HTMLDivElement>(null)

  const [viewerStage, setViewerStage] = useState<'stage1' | 'stage2'>('stage1')
  const [activeWeekIdx, setActiveWeekIdx] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('dayMap')
  const [activeDayIdx, setActiveDayIdx] = useState<number | null>(null)
  const [expandedExId, setExpandedExId] = useState<string | null>(null)

  useEffect(() => {
    setViewerStage('stage1')
    setViewMode('dayMap')
    setActiveWeekIdx(0)
    setActiveDayIdx(null)
    setExpandedExId(null)
  }, [plan.id])

  const weekCount = plan.planWeeks.length
  const activeWeek = plan.planWeeks[activeWeekIdx]
  const activeDays = activeWeek?.days ?? []
  const activeDay = activeDayIdx !== null ? (activeDays[activeDayIdx] ?? null) : null

  function syncIndicator(weekIdx: number, animated: boolean) {
    const el = weekIndicatorRef.current
    const btn = weekTabBtnRefs.current[weekIdx]
    if (!el || !btn) return

    const left = btn.offsetLeft + 14
    const width = btn.offsetWidth - 28
    el.style.transition = animated ? 'left 220ms ease, width 220ms ease' : ''
    el.style.left = `${left}px`
    el.style.width = `${width}px`

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
      const scrollLeft = weekIdx * viewport.clientWidth
      chipsEl.style.transition = ''
      chipsEl.style.transform = `translateX(-${scrollLeft}px)`
    }

    const track = weekTabsTrackRef.current
    const outer = weekTabsOuterRef.current
    if (track && outer) {
      const containerWidth = outer.offsetWidth
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2
      track.style.transition = animated ? 'transform 220ms ease' : ''
      track.style.transform = `translateX(${containerWidth / 2 - btnCenter}px)`
    }
  }

  useEffect(() => {
    if (viewerStage !== 'stage2' || viewMode !== 'dayMap' || weekCount === 0) return
    const raf = requestAnimationFrame(() => syncIndicator(activeWeekIdx, false))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerStage, viewMode, weekCount])

  useEffect(() => {
    if (viewerStage !== 'stage2' || viewMode !== 'dayMap' || weekCount === 0) return
    const viewport = weekViewportRef.current
    if (!viewport) return

    function onScroll() {
      const vw = viewport!.clientWidth
      if (vw <= 0) return
      const progress = viewport!.scrollLeft / vw
      const fromIdx = Math.max(0, Math.floor(progress))
      const toIdx = Math.min(weekCount - 1, Math.ceil(progress))
      const t = progress - Math.floor(progress)

      const fromBtn = weekTabBtnRefs.current[fromIdx]
      const toBtn = weekTabBtnRefs.current[toIdx]
      const el = weekIndicatorRef.current
      if (!fromBtn || !toBtn || !el) return

      const fromLeft = fromBtn.offsetLeft + 14
      const toLeft = toBtn.offsetLeft + 14
      const fromW = fromBtn.offsetWidth - 28
      const toW = toBtn.offsetWidth - 28
      el.style.transition = ''
      el.style.left = `${fromLeft + (toLeft - fromLeft) * t}px`
      el.style.width = `${fromW + (toW - fromW) * t}px`

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
  }, [viewerStage, viewMode, weekCount])

  useEffect(() => {
    if (viewerStage !== 'stage2' || viewMode !== 'dayMap' || weekCount === 0) return
    const viewport = weekViewportRef.current
    if (!viewport) return

    function onScrollEnd() {
      const vw = viewport!.clientWidth
      if (vw <= 0) return
      const idx = Math.round(viewport!.scrollLeft / vw)
      const next = Math.min(Math.max(idx, 0), weekCount - 1)
      setActiveWeekIdx(next)
      requestAnimationFrame(() => syncIndicator(next, true))
    }

    viewport.addEventListener('scrollend', onScrollEnd)
    return () => viewport.removeEventListener('scrollend', onScrollEnd)
  }, [viewerStage, viewMode, weekCount])

  useEffect(() => {
    if (viewerStage !== 'stage2' || viewMode !== 'dayMap' || weekCount === 0) return
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * activeWeekIdx, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerStage, viewMode, weekCount])

  function scrollWeekTo(weekIdx: number) {
    const viewport = weekViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ left: viewport.clientWidth * weekIdx, behavior: 'smooth' })
    setActiveWeekIdx(weekIdx)
    requestAnimationFrame(() => syncIndicator(weekIdx, false))
  }

  function enterDayEditor(dayIdx: number) {
    setActiveDayIdx(dayIdx)
    setViewMode('dayEditor')
    setExpandedExId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToDayMap() {
    setViewMode('dayMap')
    setExpandedExId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goBackToViewerStage1() {
    setViewerStage('stage1')
    setViewMode('dayMap')
    setActiveDayIdx(null)
    setExpandedExId(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function goToViewerStage2() {
    setViewerStage('stage2')
    setViewMode('dayMap')
    setActiveDayIdx(null)
    setExpandedExId(null)
    requestAnimationFrame(() => {
      const viewport = weekViewportRef.current
      if (viewport) {
        viewport.scrollTo({ left: viewport.clientWidth * activeWeekIdx, behavior: 'auto' })
      }
      syncIndicator(activeWeekIdx, false)
    })
  }

  const editPlanHref = `/coach/library/plans/${plan.id}/edit`
  const pencilEditSlot = (
    <Link
      href={editPlanHref}
      aria-label="Editar plan"
      title="Editar plan"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        lineHeight: 0,
        textDecoration: 'none',
      }}
    >
      <Pencil size={16} color="#B5F23D" />
    </Link>
  )

  const stage1Block = useMemo(
    () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 4 }}>
        <ReadonlyField label="Nombre">
          <div style={stage1TextFieldContainerStyle}>
            <div style={stage1ReadonlyTextStyle}>{plan.name.trim() || '—'}</div>
          </div>
        </ReadonlyField>

        <ReadonlyField
          label={
            <>
              Descripción <span style={{ color: '#CBD5E1', fontWeight: 500 }}>(opcional)</span>
            </>
          }
        >
          <div style={stage1TextFieldContainerStyle}>
            <div style={stage1ReadonlyTextStyle}>
              {plan.description?.trim() ? plan.description.trim() : '—'}
            </div>
          </div>
        </ReadonlyField>

        <ReadonlyField label="Semanas" alignCenter>
          <div
            style={{
              ...stage1TextFieldContainerStyle,
              position: 'relative',
              width: 'min(80px, 100%)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                ...stage1ReadonlyTextStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                width: '100%',
                padding: 0,
                textAlign: 'center',
              }}
            >
              {weekCount || plan.weeks}
            </div>
          </div>
        </ReadonlyField>
      </div>
    ),
    [plan.name, plan.description, plan.weeks, weekCount]
  )

  if (weekCount === 0) {
    return (
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlowHeaderConfig
          title={plan.name.trim() || 'Plan'}
          fallbackHref="/coach/library?tab=plans"
          rightSlot={pencilEditSlot}
        />
        <div style={{ padding: 24, color: '#9CA3AF', fontSize: 14 }}>Este plan no tiene semanas cargadas.</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes planViewerContinuarArrow {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0.85;
          }
          50% {
            transform: translateX(6px);
            opacity: 1;
          }
        }
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
        @media (prefers-reduced-motion: reduce) {
          [data-plan-viewer-continuar-arrow='true'] {
            animation: none !important;
          }
        }
      `}</style>

      {viewerStage === 'stage1' ? (
        <FlowHeaderConfig
          title="Editar plan"
          fallbackHref="/coach/library?tab=plans"
          rightSlot={pencilEditSlot}
        />
      ) : viewMode === 'dayEditor' && activeDayIdx !== null && activeDay ? (
        <FlowHeaderConfig
          title={`Sem ${activeWeekIdx + 1} · ${DAY_FULL_LABELS[activeDay.dayOfWeek - 1]}`}
          fallbackHref="/coach/library?tab=plans"
          onBack={goToDayMap}
          rightSlot={pencilEditSlot}
        />
      ) : (
        <FlowHeaderConfig
          title={plan.name.trim() || 'Plan'}
          fallbackHref="/coach/library?tab=plans"
          onBack={goBackToViewerStage1}
          rightSlot={pencilEditSlot}
        />
      )}

      {viewerStage === 'stage1' ? (
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
            {stage1Block}
            <button
              type="button"
              onClick={goToViewerStage2}
              style={{
                alignSelf: 'center',
                width: 'fit-content',
                height: 42,
                borderRadius: 20,
                border: 'none',
                padding: '0 24px',
                fontSize: 16,
                fontWeight: 700,
                color: '#0A0A0A',
                backgroundColor: '#B5F23D',
                cursor: 'pointer',
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
                data-plan-viewer-continuar-arrow="true"
                style={{
                  display: 'inline-block',
                  animation: 'planViewerContinuarArrow 1s ease-in-out infinite',
                }}
              >
                →
              </span>
            </button>
          </div>
        </div>
      ) : viewMode === 'dayEditor' && activeDayIdx !== null && activeDay ? (
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
              {activeDay.exercises.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '20px 0', margin: 0 }}>
                  Sin ejercicios asignados.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeDay.exercises.map((ex, i) => (
                    <ExerciseReadonlyCard
                      key={ex.id}
                      ex={ex}
                      index={i}
                      isExpanded={expandedExId === ex.id}
                      onToggle={() => setExpandedExId(expandedExId === ex.id ? null : ex.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
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
              <div ref={weekTabsOuterRef} style={{ overflow: 'hidden', marginLeft: -20, marginRight: -20 }}>
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
                  {plan.planWeeks.map((_, i) => (
                    <button
                      key={plan.planWeeks[i]!.id}
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

            <div style={{ overflow: 'clip' as CSSProperties['overflow'], marginLeft: -20, marginRight: -20 }}>
              <div ref={chipsInnerRef} style={{ display: 'flex', willChange: 'transform' }}>
                {plan.planWeeks.map((w, weekIdx) => (
                  <div
                    key={w.id}
                    style={{ flex: '0 0 100%', padding: '10px 20px 14px', boxSizing: 'border-box' }}
                  >
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between' }}>
                      {DAY_LABELS.map((lbl, idx) => {
                        const dow = idx + 1
                        const on = dowHasTraining(w, dow)
                        return (
                          <div
                            key={dow}
                            aria-hidden
                            style={{
                              flex: '1 0 0',
                              height: 34,
                              borderRadius: 9999,
                              border: `1.5px solid ${on ? '#B5F23D' : '#2A2D34'}`,
                              backgroundColor: on ? '#B5F23D' : 'transparent',
                              color: on ? '#0A0A0A' : '#6B7280',
                              fontSize: 10,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {lbl}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
            {plan.planWeeks.map((w, weekIdx) => {
              const weekDays = [...(w.days ?? [])].sort((a, b) => a.order - b.order)

              return (
                <div
                  key={w.id}
                  style={{
                    flex: '0 0 100%',
                    minWidth: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    overscrollBehaviorY: 'contain',
                    scrollSnapAlign: 'start',
                    padding: '16px 20px 120px',
                    touchAction: 'pan-y',
                  }}
                >
                  {weekDays.length === 0 ? (
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
                        Esta semana no tiene días de entrenamiento.
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
                      {weekDays.map((day, di) => {
                        const exerciseCount = day.exercises.length
                        return (
                          <div
                            key={day.id}
                            style={{
                              width: '100%',
                              backgroundColor: '#111317',
                              borderRadius: 14,
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveWeekIdx(weekIdx)
                                enterDayEditor(di)
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
                                  {DAY_FULL_LABELS[day.dayOfWeek - 1]}
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
                                </p>
                              </span>
                            </button>
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
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
