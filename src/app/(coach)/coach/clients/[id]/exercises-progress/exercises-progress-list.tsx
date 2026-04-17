'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ExerciseProgressData } from '../progress-queries'
import { muscleGroupLabel, MUSCLE_GROUP_ORDER } from '@/features/exercises/muscle-groups'

// ── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({ ex, clientId }: { ex: ExerciseProgressData; clientId: string }) {
  const bw = ex.lastTopSetKg === null && ex.peakTopSetKg === null

  return (
    <Link href={`/coach/clients/${clientId}/exercises-progress/${ex.exerciseId}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid #1A1E24' }}>

        {/* Left: name + session count */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#B5F23D', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ex.exerciseName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
            {bw && ' · Sin carga'}
          </p>
        </div>

        {/* Right: PR or sets + chevron
            ↳ Para ajustar el espacio entre el badge y la flecha: cambiá el valor de marginRight abajo.
              Actualmente: marginRight: 28. Más número = más separación. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          {bw ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginRight: 28 }}>
              {ex.sessions.length > 0 ? `${ex.sessions[ex.sessions.length - 1].completedSets} series` : '—'}
            </span>
          ) : ex.peakTopSetKg !== null ? (
            <span style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#10B981',
              background: '#FFFFFF',
              border: '1.5px solid #000000',
              borderRadius: 8,
              padding: '4px 10px',
              marginRight: 28, /* ← ajustá este número para mover el badge más lejos o cerca de la flecha */
            }}>
              PR: {ex.peakTopSetKg} kg
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#4B5563', marginRight: 28 }}>—</span>
          )}
          <ChevronRight size={20} color="#B5F23D" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  )
}

// ── Muscle group card ─────────────────────────────────────────────────────────

function MuscleGroupCard({ group, exercises, clientId }: { group: string; exercises: ExerciseProgressData[]; clientId: string }) {
  const [expanded, setExpanded] = useState(false)
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
            <span style={{ fontSize: 11, fontWeight: 600, color: '#F0F0F0', background: '#1A1E24', borderRadius: 9999, padding: '2px 8px' }}>
              {exercises.length}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#4B5563', margin: '4px 0 0' }}>
            {totalSessions} sesiones
            {improving > 0 && <span style={{ color: '#B5F23D' }}> · {improving} mejorando ↑</span>}
          </p>
        </div>

        {/* Arrow — no container, white when closed, lime when open */}
        <span
          style={{
            fontSize: 22,
            color: expanded ? '#B5F23D' : '#FFFFFF',
            display: 'inline-block',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s, color 0.15s',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ▾
        </span>
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
