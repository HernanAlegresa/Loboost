import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetupClientPlanForm from './setup-client-plan-form'

export default async function SetupClientPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ templateId?: string }>
}) {
  const { id: clientId } = await params
  const { templateId } = await searchParams

  if (!templateId) notFound()

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: client } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .eq('role', 'client')
    .single()
  if (!client) notFound()

  const { data: template } = await supabase
    .from('plans')
    .select('id, name, weeks')
    .eq('id', templateId)
    .eq('coach_id', user.id)
    .single()
  if (!template) notFound()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SetupClientPlanForm
        clientId={clientId}
        clientName={client.full_name ?? 'Cliente sin nombre'}
        template={template}
      />
    </div>
  )
}
