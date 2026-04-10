import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercisesForPlanBuilder } from '../queries'
import PlanBuilderForm from '../plan-builder-form'

export default async function NewPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const exercises = await getCoachExercisesForPlanBuilder(user.id)

  return <PlanBuilderForm exercises={exercises} mode="create" />
}
