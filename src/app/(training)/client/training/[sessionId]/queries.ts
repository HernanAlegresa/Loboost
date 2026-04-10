import { createClient } from '@/lib/supabase/server'
import type { LiveSessionData, LiveExercise, SetLog } from '@/features/training/types'

export async function getLiveSessionData(
  sessionId: string,
  clientId: string
): Promise<LiveSessionData | null> {
  const supabase = await createClient()

  // Verify session belongs to this client
  const { data: session } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (!session) return null

  // Fetch exercises + logged sets in parallel
  const [exercisesResult, setsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type)'
      )
      .eq('client_plan_day_id', session.client_plan_day_id)
      .order('order'),
    supabase
      .from('session_sets')
      .select(
        'client_plan_day_exercise_id, set_number, weight_kg, duration_seconds, completed'
      )
      .eq('session_id', sessionId)
      .order('set_number'),
  ])

  // Index sets by exercise id
  const setsByExId = new Map<string, SetLog[]>()
  for (const s of setsResult.data ?? []) {
    const id = s.client_plan_day_exercise_id
    if (!setsByExId.has(id)) setsByExId.set(id, [])
    setsByExId.get(id)!.push({
      setNumber: s.set_number,
      weightKg: s.weight_kg,
      durationSeconds: s.duration_seconds,
      completed: s.completed,
    })
  }

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps: number | null
    duration_seconds: number | null
    rest_seconds: number | null
    exercises: { id: string; name: string; muscle_group: string; type: string } | null
  }

  const exercises: LiveExercise[] = ((exercisesResult.data as ExRow[]) ?? []).map((ex) => ({
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
    loggedSets: setsByExId.get(ex.id) ?? [],
  }))

  return {
    sessionId: session.id,
    clientPlanDayId: session.client_plan_day_id,
    status: session.status as 'in_progress' | 'completed',
    exercises,
  }
}
