import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercisesForPlanBuilder } from '../queries'
import CreatePlanForm from './create-plan-form'

export default async function NewPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const exercises = await getCoachExercisesForPlanBuilder(user.id)

  return <CreatePlanForm exercises={exercises} />
}
