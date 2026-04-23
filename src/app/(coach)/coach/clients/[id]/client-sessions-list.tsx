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
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
            Semana {session.weekNumber} · {DAY_NAMES[session.dayOfWeek]}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>{date}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {session.rpe != null ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.lime }}>RPE {session.rpe}</p>
          ) : null}
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.secondary }}>
            {session.exerciseCount} ejerc · {session.completedSets} series
          </p>
        </div>
      </div>
      {session.notes ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: T.secondary, fontStyle: 'italic', lineHeight: 1.4 }}>
          &ldquo;{session.notes}&rdquo;
        </p>
      ) : null}
    </Link>
  )
}

export default function ClientSessionsList({
  sessions,
  clientId,
  emptyLabel = 'Este cliente no tiene sesiones registradas todavía.',
}: {
  sessions: ClientSessionListItem[]
  clientId: string
  emptyLabel?: string
}) {
  if (sessions.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 20 }}>
        {emptyLabel}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} clientId={clientId} />
      ))}
    </div>
  )
}
