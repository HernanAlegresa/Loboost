import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercises } from './exercises/queries'
import { getCoachPlans } from './plans/queries'
import LibrarySwipeView from './library-swipe-view'

export default async function LibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [exercises, plans] = await Promise.all([
    getCoachExercises(user.id),
    getCoachPlans(user.id),
  ])

  return <LibrarySwipeView exercises={exercises} plans={plans} />
}
