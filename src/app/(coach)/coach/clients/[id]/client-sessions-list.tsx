'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CoachSessionsTimeline, SessionTimelineDay } from './sessions/queries'

const T = {
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function getWeekPhaseLabel(phase: 'past' | 'current' | 'future') {
  if (phase === 'current') return { label: 'Actual', color: '#B5F23D', bg: 'rgba(181,242,61,0.14)' }
  if (phase === 'past') return { label: 'Pasada', color: '#0A0A0A', bg: 'rgba(255,255,255,0.72)' }
  return { label: 'Futura', color: '#9CA3AF', bg: 'rgba(156,163,175,0.14)' }
}

function getDayStatusUi(day: SessionTimelineDay) {
  if (day.status === 'completed') return { label: 'Completada', color: '#4ADE80' }
  if (day.status === 'in_progress') return { label: 'Pendiente', color: '#F59E0B' }
  if (day.status === 'today') return { label: 'Hoy', color: '#B5F23D' }
  if (day.status === 'upcoming') return null
  return { label: 'No completada', color: '#EF4444' }
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function SessionDayRow({ day, clientId }: { day: SessionTimelineDay; clientId: string }) {
  const ui = getDayStatusUi(day)
  const canOpenSession = day.status === 'completed' && Boolean(day.sessionId)
  const sessionSummary =
    day.status === 'completed' || day.status === 'in_progress'
      ? `${day.exerciseCount} ejerc · ${day.completedSets} series`
      : 'Sin sesión registrada'
  const content = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: day.status === 'upcoming' ? 'rgba(15,19,25,0.5)' : '#0F1319',
        border: day.status === 'upcoming' ? '0.5px solid rgba(255,255,255,0.03)' : '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '10px 12px',
        minHeight: 44,
        opacity: day.status === 'upcoming' ? 0.78 : 1,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#D8DCE3' }}>
          {DAY_NAMES[day.dayOfWeek]} · {formatDate(day.date)}
        </p>
        {canOpenSession ? (
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 400, color: '#B5F23D', letterSpacing: '0.02em' }}>
            Ver sesión
          </p>
        ) : (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7B8494' }}>{sessionSummary}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        {ui ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: ui.color,
              padding: '4px 7px',
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {ui.label}
          </div>
        ) : null}
        {day.status === 'completed' || day.status === 'in_progress' ? (
          <p style={{ margin: 0, fontSize: 11, color: '#7B8494' }}>{sessionSummary}</p>
        ) : null}
      </div>
    </div>
  )

  if (canOpenSession && day.sessionId) {
    return (
      <Link href={`/coach/clients/${clientId}/sessions/${day.sessionId}`} style={{ textDecoration: 'none', display: 'block' }}>
        {content}
      </Link>
    )
  }
  return content
}

export default function ClientSessionsList({
  timeline,
  clientId,
}: {
  timeline: CoachSessionsTimeline
  clientId: string
}) {
  if (!timeline.hasPlan) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Asigná un plan activo para que el cliente pueda registrar entrenamientos.
      </p>
    )
  }

  if (timeline.weeks.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Este plan no tiene semanas con sesiones configuradas.
      </p>
    )
  }

  /** Al entrar a la lista, todas las semanas cerradas (el usuario abre lo que necesite). */
  const [expandedWeek, setExpandedWeek] = useState<number>(() => -1)

  const totalCompleted = timeline.weeks.reduce((sum, week) => sum + week.completedSessions, 0)
  const totalPlanned = timeline.weeks.reduce((sum, week) => sum + week.totalSessions, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p
        style={{
          fontSize: 12,
          color: T.muted,
          margin: '0 0 4px',
          lineHeight: 1.5,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        <span style={{ fontWeight: 800, color: '#FFFFFF' }}>
          {totalCompleted}/{totalPlanned}
        </span>{' '}
        sesiones completadas en el plan
      </p>

      {timeline.weeks.map((week) => {
        const phaseUi = getWeekPhaseLabel(week.phase)
        const isExpanded = expandedWeek === week.weekNumber
        return (
          <div key={week.weekNumber}>
            <button
              type="button"
              onClick={() => setExpandedWeek((prev) => (prev === week.weekNumber ? -1 : week.weekNumber))}
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: 'transparent',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
                borderRadius: 8,
                borderBottom: '1.5px solid rgba(181,242,61,0.4)',
                padding: '13px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <p style={{ margin: 0, color: T.text, fontSize: 15, fontWeight: 700 }}>
                  Semana {week.weekNumber}
                </p>
                <p style={{ margin: 0, color: T.secondary, fontSize: 12 }}>
                  <span style={{ color: '#B5F23D', fontWeight: 700 }}>
                    {week.completedSessions}/{week.totalSessions}
                  </span>{' '}
                  sesiones completadas
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: phaseUi.color,
                    backgroundColor: phaseUi.bg,
                    borderRadius: 999,
                    padding: '4px 8px',
                  }}
                >
                  {phaseUi.label}
                </span>
                {isExpanded ? <ChevronUp size={16} color="#B5F23D" /> : <ChevronDown size={16} color="#B5F23D" />}
              </div>
            </button>

            {isExpanded ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 8,
                  marginLeft: 14,
                  marginRight: 18,
                  paddingLeft: 10,
                  borderLeft: '1px solid rgba(181,242,61,0.8)',
                }}
              >
                {week.days.map((day) => (
                  <SessionDayRow key={day.id} day={day} clientId={clientId} />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
