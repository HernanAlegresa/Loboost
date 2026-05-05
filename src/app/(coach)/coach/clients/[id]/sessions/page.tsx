import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlowHeaderConfig } from '@/components/ui/header-context'
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

  const timeline = await getCoachSessionsTimeline(clientId, user.id)
  if (timeline === null) notFound()

  return (
    <>
      <FlowHeaderConfig
        title="Sesiones"
        fallbackHref={`/coach/clients/${clientId}`}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        <ClientSessionsList timeline={timeline} clientId={clientId} />
      </div>
    </>
  )
}
