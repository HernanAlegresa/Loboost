import { createClient } from '@/lib/supabase/server'

export type PlanListRow = {
  id: string
  name: string
  weeks: number
  created_at: string
  trainingDays: number
}

export type ClientPick = {
  id: string
  full_name: string | null
}

export type ExercisePick = {
  id: string
  name: string
  type: 'strength' | 'cardio'
}

export async function getCoachPlans(coachId: string): Promise<PlanListRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, weeks, created_at, plan_days(id)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    weeks: p.weeks,
    created_at: p.created_at,
    trainingDays: (p.plan_days as { id: string }[] | null)?.length ?? 0,
  }))
}

export async function getCoachClientsForAssign(coachId: string): Promise<ClientPick[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_id', coachId)
    .eq('role', 'client')
    .order('full_name')

  if (error || !data) return []
  return data
}

export async function getCoachExercisesForPlanBuilder(coachId: string): Promise<ExercisePick[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, type')
    .eq('coach_id', coachId)
    .order('name')

  if (error || !data) return []
  return data as ExercisePick[]
}

export async function getPlanMetaForAssign(coachId: string, planId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, weeks')
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null
  return data
}

export type PlanDetailRow = {
  id: string
  name: string
  description: string | null
  weeks: number
  trainingDays: number
}

export async function getPlanDetailForCoach(
  coachId: string,
  planId: string
): Promise<PlanDetailRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, description, weeks, plan_days(id)')
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    weeks: data.weeks,
    trainingDays: (data.plan_days as { id: string }[] | null)?.length ?? 0,
  }
}

export type PlanBuilderInitialDay = {
  dayOfWeek: number
  exercises: Array<{
    exerciseId: string
    order: number
    sets: number
    repsMin: number | null
    repsMax: number | null
    durationSeconds: number | null
    restSeconds: number | null
  }>
}

export type PlanBuilderInitial = {
  planId: string
  name: string
  description: string | null
  weeks: number
  days: PlanBuilderInitialDay[]
}

export async function getPlanForBuilderEdit(
  coachId: string,
  planId: string
): Promise<PlanBuilderInitial | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select(
      `
      id, name, description, weeks,
      plan_days (
        day_of_week,
        plan_day_exercises (
          exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds
        )
      )
    `
    )
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null

  const planDays = (data.plan_days ?? []) as Array<{
    day_of_week: number
    plan_day_exercises: Array<{
      exercise_id: string
      order: number
      sets: number
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      rest_seconds: number | null
    }>
  }>

  const days: PlanBuilderInitialDay[] = [...planDays]
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((d) => ({
      dayOfWeek: d.day_of_week,
      exercises: [...(d.plan_day_exercises ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((e) => ({
          exerciseId: e.exercise_id,
          order: e.order,
          sets: e.sets,
          repsMin: e.reps_min,
          repsMax: e.reps_max,
          durationSeconds: e.duration_seconds,
          restSeconds: e.rest_seconds,
        })),
    }))

  return {
    planId: data.id,
    name: data.name,
    description: data.description,
    weeks: data.weeks,
    days,
  }
}
