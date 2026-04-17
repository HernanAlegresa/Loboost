'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ExerciseProgressData } from '../progress-queries'
import { muscleGroupLabel, MUSCLE_GROUP_ORDER } from '@/features/exercises/muscle-groups'

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({
  groups,
  activeGroup,
  onSelect,
  countByGroup,
}: {
  groups: string[]
  activeGroup: string
  onSelect: (g: string) => void
  countByGroup: Map<string, number>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Center the active tab whenever it changes
  useEffect(() => {
    const idx = groups.indexOf(activeGroup)
    tabRefs.current[idx]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeGroup, groups])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
      } as React.CSSProperties}
    >
      {/* Spacer so first tab can center */}
      <div style={{ flex: '0 0 38vw', minWidth: '38vw' }} />

      {groups.map((group, i) => {
        const isActive = group === activeGroup
        const count = countByGroup.get(group) ?? 0
        return (
          <button
            key={group}
            ref={(el) => { tabRefs.current[i] = el }}
            onClick={() => onSelect(group)}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 18px 0',
              margin: '0 2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: isActive ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
          >
            <span
              style={{
                fontSize: isActive ? 15 : 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#B5F23D' : '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                transition: 'font-size 0.15s, color 0.15s',
              }}
            >
              {muscleGroupLabel(group)}
            </span>
            <span style={{ fontSize: 10, color: isActive ? '#6B7280' : '#4B5563', transition: 'color 0.15s' }}>
              {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
            {/* Active underline indicator */}
            <div
              style={{
                marginTop: 6,
                height: 3,
                width: isActive ? 28 : 0,
                borderRadius: 2,
                background: '#B5F23D',
                transition: 'width 0.2s',
              }}
            />
          </button>
        )
      })}

      {/* Spacer so last tab can center */}
      <div style={{ flex: '0 0 38vw', minWidth: '38vw' }} />
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: '#1A1E24', margin: '0 0 16px' }} />
}

// ── Exercise card ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const bw = ex.peakTopSetKg === null

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
        }}
      >
        {/* Left: name + sessions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
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

        {/* Right: PR + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          {!bw && ex.peakTopSetKg !== null ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#B5F23D',
                WebkitTextStroke: '0.6px #000000',
                marginRight: 14,
              } as React.CSSProperties}
            >
              PR: {ex.peakTopSetKg} kg
            </span>
          ) : bw ? (
            <span style={{ fontSize: 12, color: '#4B5563', marginRight: 14 }}>Sin carga</span>
          ) : null}
          <ChevronRight size={20} color="#B5F23D" strokeWidth={2.5} />
        </div>
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

  const countByGroup = useMemo(() => {
    const m = new Map<string, number>()
    for (const [g, exs] of grouped) m.set(g, exs.length)
    return m
  }, [grouped])

  // Exercises for active group, sorted alphabetically
  const activeExercises = useMemo(() => {
    const exs = grouped.get(activeGroup) ?? []
    return [...exs].sort((a, b) =>
      a.exerciseName.localeCompare(b.exerciseName, 'es', { sensitivity: 'base' })
    )
  }, [grouped, activeGroup])

  if (exercises.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#4B5563' }}>
          Sin sesiones de fuerza completadas aún.
        </p>
      </div>
    )
  }

  return (
    <div>
      <TabBar
        groups={sortedGroups}
        activeGroup={activeGroup}
        onSelect={setActiveGroup}
        countByGroup={countByGroup}
      />
      <Divider />
      <div style={{ padding: '0 20px' }}>
        {activeExercises.map((ex) => (
          <ExerciseCard key={ex.exerciseId} ex={ex} clientId={clientId} />
        ))}
      </div>
    </div>
  )
}
