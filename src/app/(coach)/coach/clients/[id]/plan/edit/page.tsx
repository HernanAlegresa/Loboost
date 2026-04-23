import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercisesForPlanBuilder } from '@/app/(coach)/coach/library/plans/queries'
import EditClientPlanForm from './edit-client-plan-form'

export type ClientPlanDayForEdit = {
  id: string
  weekNumber: number
  dayOfWeek: number
  order: number
  exercises: Array<{
    id: string
    exerciseId: string
    exerciseName: string
    exerciseType: 'strength' | 'cardio'
    order: number
    sets: number
    repsMin: number | null
    repsMax: number | null
    restSeconds: number | null
  }>
}

export default async function EditClientPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id: clientId } = await params
  const { mode } = await searchParams
  const readOnly = mode === 'view'

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, name, weeks')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) notFound()

  type RawDay = {
    id: string
    week_number: number
    day_of_week: number
    order: number
    client_plan_day_exercises: Array<{
      id: string
      exercise_id: string
      order: number
      sets: number
      reps_min: number | null
      reps_max: number | null
      rest_seconds: number | null
      exercises: { id: string; name: string; type: string } | null
    }>
  }

  const { data: rawDays } = await supabase
    .from('client_plan_days')
    .select(
      `id, week_number, day_of_week, order,
       client_plan_day_exercises (
         id, exercise_id, order, sets, reps_min, reps_max, rest_seconds,
         exercises ( id, name, type )
       )`
    )
    .eq('client_plan_id', plan.id)
    .order('week_number')
    .order('order')

  const exercises = await getCoachExercisesForPlanBuilder(user.id)

  const days: ClientPlanDayForEdit[] = ((rawDays as RawDay[]) ?? []).map((d) => ({
    id: d.id,
    weekNumber: d.week_number,
    dayOfWeek: d.day_of_week,
    order: d.order,
    exercises: (d.client_plan_day_exercises ?? [])
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        exerciseName: e.exercises?.name ?? 'Ejercicio',
        exerciseType: (e.exercises?.type ?? 'strength') as 'strength' | 'cardio',
        order: e.order,
        sets: e.sets,
        repsMin: e.reps_min,
        repsMax: e.reps_max,
        restSeconds: e.rest_seconds,
      })),
  }))

  return (
    <EditClientPlanForm
      clientId={clientId}
      clientPlanId={plan.id}
      planName={plan.name}
      weeks={plan.weeks}
      days={days}
      exercises={exercises}
      readOnly={readOnly}
    />
  )
}
