import { createClient } from '@/lib/supabase/server'

export type PlanListRow = {
  id: string
  name: string
  weeks: number
  created_at: string
  trainingDays: number
  isIncomplete: boolean
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
    .select('id, name, weeks, created_at, plan_days(id, plan_day_exercises(id))')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  type PlanDay = { id: string; plan_day_exercises: { id: string }[] | null }

  return data.map((p) => {
    const days = (p.plan_days as PlanDay[] | null) ?? []
    return {
      id: p.id,
      name: p.name,
      weeks: p.weeks,
      created_at: p.created_at,
      trainingDays: days.length,
      isIncomplete: days.some((d) => (d.plan_day_exercises ?? []).length === 0),
    }
  })
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

export type PlanBuilderInitialExercise = {
  exerciseId: string
  order: number
  sets: number
  repsMin: number | null
  repsMax: number | null
  durationSeconds: number | null
  restSeconds: number | null
}

export type PlanBuilderInitialDay = {
  dayOfWeek: number
  exercises: PlanBuilderInitialExercise[]
}

export type PlanBuilderInitialWeek = {
  weekNumber: number
  weekName: string | null
  weekType: string
  days: PlanBuilderInitialDay[]
}

export type PlanBuilderInitial = {
  planId: string
  name: string
  description: string | null
  weeks: number
  planWeeks: PlanBuilderInitialWeek[]
}

export type PlanDetailExercise = {
  id: string
  name: string
  type: 'strength' | 'cardio'
  order: number
  sets: number
  repsMin: number | null
  repsMax: number | null
  durationSeconds: number | null
  restSeconds: number | null
}

export type PlanDetailDay = {
  id: string
  dayOfWeek: number
  order: number
  exercises: PlanDetailExercise[]
}

export type PlanDetailWeek = {
  id: string
  weekNumber: number
  weekName: string | null
  weekType: string
  days: PlanDetailDay[]
}

export type PlanDetailFull = {
  id: string
  name: string
  description: string | null
  weeks: number
  planWeeks: PlanDetailWeek[]
}

export async function getPlanDetailFull(
  coachId: string,
  planId: string
): Promise<PlanDetailFull | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select(`
      id, name, description, weeks,
      plan_weeks (
        id, week_number, week_name, week_type,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds,
            exercises ( id, name, type )
          )
        )
      )
    `)
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null

  type RawWeek = {
    id: string
    week_number: number
    week_name: string | null
    week_type: string
    plan_days: Array<{
      id: string
      day_of_week: number
      order: number
      plan_day_exercises: Array<{
        id: string
        order: number
        sets: number
        reps_min: number | null
        reps_max: number | null
        duration_seconds: number | null
        rest_seconds: number | null
        exercises: { id: string; name: string; type: string } | null
      }>
    }>
  }

  const planWeeks: PlanDetailWeek[] = ((data.plan_weeks as RawWeek[]) ?? [])
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => ({
      id: w.id,
      weekNumber: w.week_number,
      weekName: w.week_name,
      weekType: w.week_type,
      days: (w.plan_days ?? [])
        .sort((a, b) => a.order - b.order)
        .map((d) => ({
          id: d.id,
          dayOfWeek: d.day_of_week,
          order: d.order,
          exercises: (d.plan_day_exercises ?? [])
            .sort((a, b) => a.order - b.order)
            .map((e) => ({
              id: e.id,
              name: e.exercises?.name ?? 'Ejercicio',
              type: (e.exercises?.type ?? 'strength') as 'strength' | 'cardio',
              order: e.order,
              sets: e.sets,
              repsMin: e.reps_min,
              repsMax: e.reps_max,
              durationSeconds: e.duration_seconds,
              restSeconds: e.rest_seconds,
            })),
        })),
    }))

  return { id: data.id, name: data.name, description: data.description, weeks: data.weeks, planWeeks }
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
      plan_weeks (
        id, week_number, week_name, week_type,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds
          )
        )
      )
    `
    )
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null

  type WeekRow = {
    id: string
    week_number: number
    week_name: string | null
    week_type: string
    plan_days: Array<{
      id: string
      day_of_week: number
      order: number
      plan_day_exercises: Array<{
        id: string
        exercise_id: string
        order: number
        sets: number
        reps_min: number | null
        reps_max: number | null
        duration_seconds: number | null
        rest_seconds: number | null
      }>
    }>
  }

  const planWeeks: PlanBuilderInitialWeek[] = ((data.plan_weeks as WeekRow[]) ?? [])
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => ({
      weekNumber: w.week_number,
      weekName: w.week_name,
      weekType: w.week_type,
      days: (w.plan_days ?? [])
        .sort((a, b) => a.order - b.order)
        .map((d) => ({
          dayOfWeek: d.day_of_week,
          exercises: (d.plan_day_exercises ?? [])
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
        })),
    }))

  return {
    planId: data.id,
    name: data.name,
    description: data.description,
    weeks: data.weeks,
    planWeeks,
  }
}
