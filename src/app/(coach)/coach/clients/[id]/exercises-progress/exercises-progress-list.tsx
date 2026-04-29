'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ExerciseProgressData } from '../progress-queries'
import { muscleGroupLabel, MUSCLE_GROUP_ORDER } from '@/features/exercises/muscle-groups'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: string[]
  activeGroup: string
  onSelect: (g: string) => void
}) {
  const idx = groups.indexOf(activeGroup)
  const prevGroup = idx > 0 ? groups[idx - 1] : null
  const nextGroup = idx < groups.length - 1 ? groups[idx + 1] : null

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'flex-end',
        padding: '20px 20px 15px',
        gap: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {prevGroup ? (
          <button
            onClick={() => onSelect(prevGroup)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right', opacity: 0.4 }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {muscleGroupLabel(prevGroup)}
            </p>
          </button>
        ) : <div />}
      </div>

      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#B5F23D', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {muscleGroupLabel(activeGroup)}
        </span>
        <div style={{ width: '100%', height: 3, borderRadius: 2, background: '#B5F23D', marginTop: 2 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        {nextGroup ? (
          <button
            onClick={() => onSelect(nextGroup)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', opacity: 0.4 }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {muscleGroupLabel(nextGroup)}
            </p>
          </button>
        ) : <div />}
      </div>
    </div>
  )
}

// ── Exercise card ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const trendConfig = {
    up:     { arrow: '↑', color: '#B5F23D' },
    down:   { arrow: '↓', color: '#F25252' },
    stable: { arrow: '→', color: '#6B7280' },
    none:   null,
  }[ex.trend]

  return (
    <Link
      href={`/coach/clients/${clientId}/exercises-progress/${ex.exerciseId}`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg,#12161C 0%,#0F1217 100%)',
          border: '1px solid #252A31',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: '#B5F23D',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ex.exerciseName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {trendConfig && (
            <span style={{ fontSize: 20, fontWeight: 700, color: trendConfig.color, lineHeight: 1, paddingRight: 5 }}>
              {trendConfig.arrow}
            </span>
          )}
        </div>
        <ChevronRight size={20} color="#B5F23D" strokeWidth={2.5} />
      </div>
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ExercisesProgressList({
  exercises,
  clientId,
}: {
  exercises: ExerciseProgressData[]
  clientId: string
}) {
  const { grouped, sortedGroups } = useMemo(() => {
    const grouped = new Map<string, ExerciseProgressData[]>()
    for (const ex of exercises) {
      const key = ex.muscleGroup.toLowerCase()
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ex)
    }
    const sortedGroups = Array.from(grouped.keys()).sort((a, b) => {
      const ai = (MUSCLE_GROUP_ORDER as string[]).indexOf(a)
      const bi = (MUSCLE_GROUP_ORDER as string[]).indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
    return { grouped, sortedGroups }
  }, [exercises])

  const [activeGroup, setActiveGroup] = useState(() => sortedGroups[0] ?? '')

  const viewportRef = useRef<HTMLDivElement>(null)
  // Refs for use inside native event listeners (avoid stale closures)
  const sortedGroupsRef = useRef(sortedGroups)
  sortedGroupsRef.current = sortedGroups
  const startIdxRef = useRef(0)

  // Enforce sequential navigation: record the panel index at touch start,
  // then on scrollend correct if the user jumped more than ±1 panel.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    function onTouchStart() {
      const width = vp!.clientWidth
      if (width <= 0) return
      startIdxRef.current = Math.round(vp!.scrollLeft / width)
    }

    function onScrollEnd() {
      const groups = sortedGroupsRef.current
      const width = vp!.clientWidth
      if (width <= 0) return

      const rawIdx = Math.round(vp!.scrollLeft / width)
      const startIdx = startIdxRef.current

      // Clamp to at most ±1 from where the gesture began
      const sequential = Math.max(startIdx - 1, Math.min(startIdx + 1, rawIdx))
      const clamped = Math.max(0, Math.min(groups.length - 1, sequential))

      if (clamped !== rawIdx) {
        vp!.scrollTo({ left: clamped * width, behavior: 'smooth' })
      }

      const group = groups[clamped]
      if (group) setActiveGroup(group)
    }

    vp.addEventListener('touchstart', onTouchStart, { passive: true })
    vp.addEventListener('scrollend', onScrollEnd, { passive: true })
    return () => {
      vp.removeEventListener('touchstart', onTouchStart)
      vp.removeEventListener('scrollend', onScrollEnd)
    }
  }, [])

  function handleScroll() {
    const vp = viewportRef.current
    if (!vp) return
    const width = vp.clientWidth
    if (width <= 0) return
    const idx = Math.round(vp.scrollLeft / width)
    const group = sortedGroups[Math.max(0, Math.min(idx, sortedGroups.length - 1))]
    if (group && group !== activeGroup) setActiveGroup(group)
  }

  function scrollToGroup(group: string) {
    const idx = sortedGroups.indexOf(group)
    const vp = viewportRef.current
    if (!vp || idx < 0) return
    vp.scrollTo({ left: idx * vp.clientWidth, behavior: 'smooth' })
    setActiveGroup(group)
  }

  if (exercises.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>
          Sin sesiones de fuerza completadas aún.
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TabBar groups={sortedGroups} activeGroup={activeGroup} onSelect={scrollToGroup} />

      <div
        ref={viewportRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          overscrollBehaviorX: 'contain',
        } as React.CSSProperties}
      >
        {sortedGroups.map((group) => {
          const exs = [...(grouped.get(group) ?? [])].sort((a, b) =>
            a.exerciseName.localeCompare(b.exerciseName, 'es', { sensitivity: 'base' })
          )
          return (
            <section
              key={group}
              aria-label={muscleGroupLabel(group)}
              style={{
                flex: '0 0 100%',
                minWidth: 0,
                scrollSnapAlign: 'start',
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehaviorY: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: `12px 60px ${COACH_LIST_SCROLL_END_ABOVE_NAV}`,
              } as React.CSSProperties}
            >
{exs.map((ex) => (
                <ExerciseCard key={ex.exerciseId} ex={ex} clientId={clientId} />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
