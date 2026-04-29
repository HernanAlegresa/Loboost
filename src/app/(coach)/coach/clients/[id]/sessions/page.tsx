import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getCoachSessionsTimeline } from './queries'
import ClientSessionsList from '../client-sessions-list'

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

  const timeline = await getCoachSessionsTimeline(clientId, user.id)
  if (timeline === null) notFound()

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}`}
        title="Sesiones"
        subtitle={clientProfile?.full_name ?? ''}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        <ClientSessionsList timeline={timeline} clientId={clientId} />
      </div>
    </div>
  )
}
