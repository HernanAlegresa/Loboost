import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachPlans } from '@/app/(coach)/coach/library/plans/queries'
import AssignPlanForm from './assign-plan-form'

export default async function AssignClientPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ setupError?: string }>
}) {
  const { id: clientId } = await params
  const { setupError } = await searchParams

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

  const { data: activeClientPlan } = await supabase
    .from('client_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const normalizedSetupError =
    setupError === 'template_missing' ? 'template_missing' : undefined

  const templates = await getCoachPlans(user.id)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AssignPlanForm
        clientId={clientId}
        clientName={client.full_name ?? 'Cliente sin nombre'}
        templates={templates}
        hasActivePlan={!!activeClientPlan}
        setupError={normalizedSetupError}
      />
    </div>
  )
}
