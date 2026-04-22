import { createClient } from '@/lib/supabase/server'

export type LogSessionExercise = {
  clientPlanDayExerciseId: string
  name: string
  type: 'strength' | 'cardio'
  plannedSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
}

export type LogSessionPageData = {
  clientPlanDayId: string
  dayOfWeek: number
  weekNumber: number
  existingSessionId: string | null
  exercises: LogSessionExercise[]
}

export async function getLogSessionData(
  clientPlanDayId: string,
  clientId: string
): Promise<LogSessionPageData | null> {
  const supabase = await createClient()

  const { data: planDay, error: dayErr } = await supabase
    .from('client_plan_days')
    .select(`
      id, day_of_week, week_number,
      client_plan_day_exercises (
        id, sets, reps_min, reps_max, duration_seconds, rest_seconds,
        exercises ( name, type )
      )
    `)
    .eq('id', clientPlanDayId)
    .single()

  if (dayErr || !planDay) return null

  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_plan_day_id', clientPlanDayId)
    .eq('client_id', clientId)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle()

  type RawExercise = {
    id: string
    sets: number
    reps_min: number | null
    reps_max: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: { name: string; type: string } | null
  }

  const exercises: LogSessionExercise[] = ((planDay.client_plan_day_exercises as RawExercise[]) ?? [])
    .map((ex) => ({
      clientPlanDayExerciseId: ex.id,
      name: ex.exercises?.name ?? 'Ejercicio',
      type: (ex.exercises?.type ?? 'strength') as 'strength' | 'cardio',
      plannedSets: ex.sets,
      plannedRepsMin: ex.reps_min,
      plannedRepsMax: ex.reps_max,
      plannedDurationSeconds: ex.duration_seconds,
      restSeconds: ex.rest_seconds,
    }))

  return {
    clientPlanDayId,
    dayOfWeek: planDay.day_of_week,
    weekNumber: planDay.week_number,
    existingSessionId: existingSession?.id ?? null,
    exercises,
  }
}
