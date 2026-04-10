import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercisesForPlanBuilder, getPlanForBuilderEdit } from '../../queries'
import PlanBuilderForm from '../../plan-builder-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditPlanPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [exercises, initialPlan] = await Promise.all([
    getCoachExercisesForPlanBuilder(user.id),
    getPlanForBuilderEdit(user.id, id),
  ])

  if (!initialPlan) notFound()

  return <PlanBuilderForm exercises={exercises} mode="edit" initialPlan={initialPlan} />
}
