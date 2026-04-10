import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type {
  WeekDetailData,
  WeekDetailSession,
  WeekDetailExercise,
  WeekDetailSet,
} from '@/features/training/types'

export async function getWeekDetailData(
  clientId: string,
  weekNumber: number
): Promise<WeekDetailData | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan || weekNumber < 1 || weekNumber > plan.weeks) return null

  const { data: days } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week')
    .eq('client_plan_id', plan.id)
    .eq('week_number', weekNumber)
    .order('day_of_week')

  if (!days || days.length === 0) return null

  const dayIds = days.map((d) => d.id)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status, completed_at, date')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .in('client_plan_day_id', dayIds)

  const dateRangeStart = computeDayDate(plan.start_date, weekNumber, 1)
  const dateRangeEnd = computeDayDate(plan.start_date, weekNumber, 7)

  if (!sessions || sessions.length === 0) {
    return {
      weekNumber,
      dateRangeStart,
      dateRangeEnd,
      sessions: [],
    }
  }

  const sessionIds = sessions.map((s) => s.id)

  const { data: setsData } = await supabase
    .from('session_sets')
    .select(
      `session_id, set_number, weight_kg, duration_seconds, completed, client_plan_day_exercise_id,
       client_plan_day_exercises (
         order, sets, reps, duration_seconds,
         exercises (name, muscle_group, type)
       )`
    )
    .in('session_id', sessionIds)
    .order('set_number')

  type SetRow = {
    session_id: string
    set_number: number
    weight_kg: number | null
    duration_seconds: number | null
    completed: boolean
    client_plan_day_exercise_id: string
    client_plan_day_exercises: {
      order: number
      sets: number
      reps: number | null
      duration_seconds: number | null
      exercises: { name: string; muscle_group: string; type: string } | null
    } | null
  }

  const setsBySession = new Map<string, SetRow[]>()
  for (const row of (setsData as SetRow[]) ?? []) {
    if (!setsBySession.has(row.session_id)) setsBySession.set(row.session_id, [])
    setsBySession.get(row.session_id)!.push(row)
  }

  const dayById = new Map(days.map((d) => [d.id, d]))

  const detailSessions: WeekDetailSession[] = sessions.map((sess) => {
    const dayInfo = dayById.get(sess.client_plan_day_id)
    const dateISO = dayInfo
      ? computeDayDate(plan.start_date, weekNumber, dayInfo.day_of_week)
      : sess.date

    const sessionSets = setsBySession.get(sess.id) ?? []

    const exerciseMap = new Map<string, SetRow[]>()
    for (const row of sessionSets) {
      if (!exerciseMap.has(row.client_plan_day_exercise_id))
        exerciseMap.set(row.client_plan_day_exercise_id, [])
      exerciseMap.get(row.client_plan_day_exercise_id)!.push(row)
    }

    const exercises: WeekDetailExercise[] = Array.from(exerciseMap.entries())
      .map(([exId, rows]) => {
        const sample = rows[0]!
        const exInfo = sample.client_plan_day_exercises
        const order = exInfo?.order ?? 0
        const sets: WeekDetailSet[] = rows
          .sort((a, b) => a.set_number - b.set_number)
          .map((r) => ({
            setNumber: r.set_number,
            weightKg: r.weight_kg,
            durationSeconds: r.duration_seconds,
            completed: r.completed,
          }))
        const ex: WeekDetailExercise = {
          clientPlanDayExerciseId: exId,
          name: exInfo?.exercises?.name ?? 'Ejercicio',
          muscleGroup: exInfo?.exercises?.muscle_group ?? '',
          type: (exInfo?.exercises?.type as 'strength' | 'cardio') ?? 'strength',
          plannedReps: exInfo?.reps ?? null,
          plannedDurationSeconds: exInfo?.duration_seconds ?? null,
          sets,
        }
        return { ex, order }
      })
      .sort((a, b) => a.order - b.order)
      .map(({ ex }) => ex)

    return {
      sessionId: sess.id,
      clientPlanDayId: sess.client_plan_day_id,
      dayOfWeek: dayInfo?.day_of_week ?? 0,
      dateISO,
      completedAt: sess.completed_at,
      exercises,
    }
  })

  detailSessions.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return {
    weekNumber,
    dateRangeStart,
    dateRangeEnd,
    sessions: detailSessions,
  }
}
