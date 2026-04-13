import { createClient } from '@/lib/supabase/server'
import {
  computeDayDate,
  computeDayStatus,
  getTodayISO,
} from '@/features/clients/utils/training-utils'
import type { DayDetailData, DayExerciseDetail } from '@/features/training/types'

export async function getDayDetailData(
  clientPlanDayId: string,
  clientId: string
): Promise<DayDetailData | null> {
  const supabase = await createClient()

  type DayRow = {
    id: string
    week_number: number
    day_of_week: number
    client_plans: { client_id: string; start_date: string } | null
  }

  const { data: day } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week, client_plans(client_id, start_date)')
    .eq('id', clientPlanDayId)
    .single()

  const dayRow = day as DayRow | null
  if (!dayRow || dayRow.client_plans?.client_id !== clientId) return null

  const startDate = dayRow.client_plans.start_date
  const dateISO = computeDayDate(
    startDate,
    dayRow.week_number,
    dayRow.day_of_week
  )
  const todayISO = getTodayISO()

  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
      )
      .eq('client_plan_day_id', clientPlanDayId)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_plan_day_id', clientPlanDayId)
      .eq('client_id', clientId)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: {
      id: string
      name: string
      muscle_group: string
      type: string
      video_url: string | null
    } | null
  }

  const exercises: DayExerciseDetail[] = (
    (exercisesResult.data as ExRow[]) ?? []
  ).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercises?.name ?? 'Ejercicio',
    muscleGroup: ex.exercises?.muscle_group ?? '',
    type: (ex.exercises?.type as 'strength' | 'cardio') ?? 'strength',
    order: ex.order,
    plannedSets: ex.sets,
    plannedReps: ex.reps ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
    restSeconds: ex.rest_seconds ?? null,
    videoUrl: ex.exercises?.video_url ?? null,
  }))

  return {
    clientPlanDayId,
    weekNumber: dayRow.week_number,
    dayOfWeek: dayRow.day_of_week,
    dateISO,
    dayStatus: computeDayStatus(
      dateISO,
      todayISO,
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null
    ),
    exercises,
    sessionId: sessionResult.data?.id ?? null,
    sessionStatus:
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ??
      null,
  }
}
