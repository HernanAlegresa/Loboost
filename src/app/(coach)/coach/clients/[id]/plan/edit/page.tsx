import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachExercisesForPlanBuilder } from '@/app/(coach)/coach/library/plans/queries'
import ViewEditClientPlanForm from './view-edit-client-plan-form'
import EditClientPlanMetaForm from './edit-client-plan-meta-form'

export type ClientPlanDayForEdit = {
  id: string
  weekNumber: number
  dayOfWeek: number
  order: number
  hasCompletedSessions: boolean
  exercises: Array<{
    id: string
    exerciseId: string
    exerciseName: string
    exerciseType: 'strength' | 'cardio'
    order: number
    sets: number
    repsMin: number | null
    repsMax: number | null
    durationSeconds: number | null
    restSeconds: number | null
  }>
}

export default async function EditClientPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string; stage?: string; from?: string }>
}) {
  const { id: clientId } = await params
  const { mode, stage, from } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .eq('role', 'client')
    .single()
  if (!clientProfile) notFound()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, name, weeks, start_date, end_date')
    .eq('client_id', clientId)
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) notFound()

  // Stage 1: meta editor — skip for view mode and when already in stage 2
  if (stage !== '2' && mode !== 'view') {
    return (
      <EditClientPlanMetaForm
        clientId={clientId}
        clientPlanId={plan.id}
        planName={plan.name}
        weeks={plan.weeks}
        startDate={plan.start_date}
      />
    )
  }

  const readOnly = mode === 'view'
  const isAssignStage2Flow = !readOnly && stage === '2' && from === 'assign'
  const editorBackHref = isAssignStage2Flow
    ? `/coach/clients/${clientId}`
    : `/coach/clients/${clientId}/plan/edit`

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
      duration_seconds: number | null
      rest_seconds: number | null
      exercises: { id: string; name: string; type: string } | null
    }>
  }

  const { data: rawDays } = await supabase
    .from('client_plan_days')
    .select(
      `id, week_number, day_of_week, order,
       client_plan_day_exercises (
         id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds,
         exercises ( id, name, type )
       )`
    )
    .eq('client_plan_id', plan.id)
    .order('week_number')
    .order('order')

  const dayIds = (rawDays ?? []).map((d) => d.id)
  const { data: completedSessions } = dayIds.length > 0
    ? await supabase
        .from('sessions')
        .select('client_plan_day_id')
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .in('client_plan_day_id', dayIds)
    : { data: [] }

  const completedDayIds = new Set((completedSessions ?? []).map((s) => s.client_plan_day_id))

  const exercises = await getCoachExercisesForPlanBuilder(user.id)

  const days: ClientPlanDayForEdit[] = ((rawDays as RawDay[]) ?? []).map((d) => ({
    id: d.id,
    weekNumber: d.week_number,
    dayOfWeek: d.day_of_week,
    order: d.order,
    hasCompletedSessions: completedDayIds.has(d.id),
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
        durationSeconds: e.duration_seconds,
        restSeconds: e.rest_seconds,
      })),
  }))

  return (
    <ViewEditClientPlanForm
      clientId={clientId}
      clientPlanId={plan.id}
      planName={plan.name}
      weeks={plan.weeks}
      days={days}
      exercises={exercises}
      readOnly={readOnly}
      clientName={clientProfile.full_name ?? 'Cliente sin nombre'}
      startDate={plan.start_date}
      endDate={plan.end_date}
      backHref={
        readOnly
          ? `/coach/clients/${clientId}`
          : editorBackHref
      }
    />
  )
}
