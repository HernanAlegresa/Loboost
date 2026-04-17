'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ExerciseProgressData } from '../progress-queries'
import { muscleGroupLabel, MUSCLE_GROUP_ORDER } from '@/features/exercises/muscle-groups'

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePctChange(values: (number | null)[]): number | null {
  const filled = values.filter((v): v is number => v !== null)
  if (filled.length < 2) return null
  const prev = filled[filled.length - 2]
  const last = filled[filled.length - 1]
  if (prev === 0) return null
  return Math.round(((last - prev) / prev) * 100)
}

function isBodyweight(ex: ExerciseProgressData): boolean {
  return ex.lastTopSetKg === null && ex.peakTopSetKg === null
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ ex }: { ex: ExerciseProgressData }) {
  const bw = isBodyweight(ex)

  const pct = bw
    ? computePctChange(ex.sessions.map((s) => s.completedSets))
    : computePctChange(ex.sessions.map((s) => s.topSetKg))

  const trend = bw
    ? (() => {
        if (ex.sessions.length < 2) return 'none' as const
        const prev = ex.sessions[ex.sessions.length - 2].completedSets
        const last = ex.sessions[ex.sessions.length - 1].completedSets
        if (last > prev) return 'up' as const
        if (last < prev) return 'down' as const
        return 'stable' as const
      })()
    : ex.trend

  if (trend === 'none') return null

  const map = {
    up:     { symbol: '↑', color: '#B5F23D', bg: 'rgba(181,242,61,0.1)' },
    down:   { symbol: '↓', color: '#F25252', bg: 'rgba(242,82,82,0.1)' },
    stable: { symbol: '→', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
  } as const

  const { symbol, color, bg } = map[trend]
  const pctLabel = pct !== null && pct !== 0 ? ` ${pct > 0 ? '+' : ''}${pct}%` : ''

  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '2px 7px', lineHeight: 1, whiteSpace: 'nowrap' }}>
      {symbol}{pctLabel}
    </span>
  )
}

// ── Exercise row (navegable a subpage) ────────────────────────────────────────

function ExerciseRow({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const bw = isBodyweight(ex)

  return (
    <Link href={`/coach/clients/${clientId}/exercises-progress/${ex.exerciseId}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid #1A1E24' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ex.exerciseName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
            {bw && ' · Sin carga'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            {bw ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>
                {ex.sessions.length > 0 ? `${ex.sessions[ex.sessions.length - 1].completedSets} series` : '—'}
              </span>
            ) : ex.lastTopSetKg !== null ? (
              <>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F0' }}>{ex.lastTopSetKg} kg</span>
                {ex.peakTopSetKg !== null && ex.peakTopSetKg !== ex.lastTopSetKg && (
                  <p style={{ fontSize: 10, color: '#4B5563', margin: '2px 0 0' }}>pico {ex.peakTopSetKg} kg</p>
                )}
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#4B5563' }}>—</span>
            )}
          </div>
          <TrendBadge ex={ex} />
          <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
        </div>
      </div>
    </Link>
  )
}

// ── Muscle group card ─────────────────────────────────────────────────────────

function MuscleGroupCard({ group, exercises, clientId }: { group: string; exercises: ExerciseProgressData[]; clientId: string }) {
  const [expanded, setExpanded] = useState(exercises.length <= 4)
  const totalSessions = exercises.reduce((s, ex) => s + ex.sessionCount, 0)
  const improving     = exercises.filter((ex) => ex.trend === 'up').length

  return (
    <div style={{ background: 'linear-gradient(160deg,#12161C 0%,#0F1217 100%)', border: '1px solid #252A31', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {muscleGroupLabel(group)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#1A1E24', borderRadius: 9999, padding: '2px 8px' }}>
              {exercises.length}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#4B5563', margin: '4px 0 0' }}>
            {totalSessions} sesiones
            {improving > 0 && <span style={{ color: '#B5F23D' }}> · {improving} mejorando ↑</span>}
          </p>
        </div>

        <div style={{ width: 28, height: 28, borderRadius: 8, background: expanded ? 'rgba(181,242,61,0.1)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
          <span style={{ fontSize: 14, color: expanded ? '#B5F23D' : '#6B7280', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px', borderTop: '1px solid #1A1E24' }}>
          {exercises.map((ex) => <ExerciseRow key={ex.exerciseId} ex={ex} clientId={clientId} />)}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ExercisesProgressList({ exercises, clientId }: { exercises: ExerciseProgressData[]; clientId: string }) {
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

  if (exercises.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#4B5563' }}>
          Sin sesiones completadas aún. Los datos aparecerán cuando el cliente registre entrenamientos.
        </p>
      </div>
    )
  }

  return (
    <div>
      {sortedGroups.map((group) => (
        <MuscleGroupCard key={group} group={group} exercises={grouped.get(group)!} clientId={clientId} />
      ))}
    </div>
  )
}
