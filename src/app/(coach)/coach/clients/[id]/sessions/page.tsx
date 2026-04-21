import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getClientSessionsForCoach } from './queries'
import type { ClientSessionListItem } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function SessionRow({ session, clientId }: { session: ClientSessionListItem; clientId: string }) {
  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Link
      href={`/coach/clients/${clientId}/sessions/${session.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
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
          {session.rpe != null && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.lime }}>RPE {session.rpe}</p>
          )}
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.secondary }}>
            {session.exerciseCount} ejerc · {session.completedSets} series
          </p>
        </div>
      </div>
      {session.notes && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: T.secondary, fontStyle: 'italic', lineHeight: 1.4 }}>
          &ldquo;{session.notes}&rdquo;
        </p>
      )}
    </Link>
  )
}

export default async function ClientSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', clientId)
    .single()

  const sessions = await getClientSessionsForCoach(clientId, user.id)
  if (sessions === null) notFound()

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}`}
        title="Sesiones"
        subtitle={clientProfile?.full_name ?? ''}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {sessions.length === 0 ? (
          <p style={{ textAlign: 'center', color: T.muted, fontSize: 14, paddingTop: 40 }}>
            Este cliente no tiene sesiones registradas todavía.
          </p>
        ) : (
          sessions.map((s) => <SessionRow key={s.id} session={s} clientId={clientId} />)
        )}
      </div>
    </div>
  )
}
