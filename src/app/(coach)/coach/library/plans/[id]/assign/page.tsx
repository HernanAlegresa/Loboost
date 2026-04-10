import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachClientsForAssign, getPlanMetaForAssign } from '../../queries'
import AssignPlanForm from './assign-plan-form'

type Props = { params: Promise<{ id: string }> }

export default async function AssignPlanPage({ params }: Props) {
  const { id: planId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const plan = await getPlanMetaForAssign(user.id, planId)
  if (!plan) notFound()

  const clients = await getCoachClientsForAssign(user.id)

  return (
    <AssignPlanForm planId={plan.id} planName={plan.name} planWeeks={plan.weeks} clients={clients} />
  )
}
