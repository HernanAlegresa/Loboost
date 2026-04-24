import Link from 'next/link'
import type { ClientSessionListItem } from './sessions/queries'

const T = {
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatDaysAgo(sessions: ClientSessionListItem[]): string | null {
  if (sessions.length === 0) return null
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]
  const diffMs = Date.now() - new Date(latest!.date + 'T00:00:00').getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

function SessionRow({ session, clientId }: { session: ClientSessionListItem; clientId: string }) {
  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/coach/clients/${clientId}/sessions/${session.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
            {DAY_NAMES[session.dayOfWeek]} · {date}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
            {session.exerciseCount} ejerc · {session.completedSets} series
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {session.rpe != null ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.lime }}>
              RPE {session.rpe}
            </p>
          ) : null}
        </div>
      </div>
      {session.notes ? (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 12,
            color: T.secondary,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          &ldquo;{session.notes}&rdquo;
        </p>
      ) : null}
    </Link>
  )
}

function WeekOverline({ weekNumber }: { weekNumber: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        marginTop: 16,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#4B5563',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        Semana {weekNumber}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#1F2227' }} />
    </div>
  )
}

export default function ClientSessionsList({
  sessions,
  clientId,
  hasPlan = true,
}: {
  sessions: ClientSessionListItem[]
  clientId: string
  hasPlan?: boolean
}) {
  if (!hasPlan) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Asigná un plan activo para que el cliente pueda registrar entrenamientos.
      </p>
    )
  }

  if (sessions.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20, lineHeight: 1.5 }}>
        Todavía no hay entrenamientos registrados en este plan.
      </p>
    )
  }

  const byWeek = new Map<number, ClientSessionListItem[]>()
  for (const session of sessions) {
    if (!byWeek.has(session.weekNumber)) byWeek.set(session.weekNumber, [])
    byWeek.get(session.weekNumber)!.push(session)
  }
  const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => b - a)

  const daysAgo = formatDaysAgo(sessions)

  return (
    <div>
      <p
        style={{
          fontSize: 12,
          color: T.muted,
          margin: '0 0 4px',
          lineHeight: 1.5,
        }}
      >
        {sessions.length} {sessions.length === 1 ? 'sesión completada' : 'sesiones completadas'}
        {daysAgo ? ` · Última ${daysAgo}` : ''}
      </p>

      {sortedWeeks.map((weekNumber) => (
        <div key={weekNumber}>
          <WeekOverline weekNumber={weekNumber} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byWeek.get(weekNumber)!.map((session) => (
              <SessionRow key={session.id} session={session} clientId={clientId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
