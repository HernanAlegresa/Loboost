import { createClient } from '@/lib/supabase/server'
import type { LiveSessionData, LiveExercise, SetLog } from '@/features/training/types'

export async function getLiveSessionData(
  sessionId: string,
  clientId: string
): Promise<LiveSessionData | null> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (!session) return null

  const [exercisesResult, setsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds, exercises(id, name, muscle_group, type, video_url)'
      )
      .eq('client_plan_day_id', session.client_plan_day_id)
      .order('order'),
    supabase
      .from('session_sets')
      .select(
        'client_plan_day_exercise_id, set_number, reps_performed, weight_kg, duration_seconds, completed'
      )
      .eq('session_id', sessionId)
      .order('set_number'),
  ])

  const setsByExId = new Map<string, SetLog[]>()
  for (const s of setsResult.data ?? []) {
    const id = s.client_plan_day_exercise_id
    if (!setsByExId.has(id)) setsByExId.set(id, [])
    setsByExId.get(id)!.push({
      setNumber: s.set_number,
      repsPerformed: s.reps_performed ?? null,
      weightKg: s.weight_kg ?? null,
      durationSeconds: s.duration_seconds ?? null,
      completed: s.completed,
    })
  }

  type ExRow = {
    id: string
    exercise_id: string
    order: number
    sets: number
    reps_min: number | null
    reps_max: number | null
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

  const exercises: LiveExercise[] = ((exercisesResult.data as ExRow[]) ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    exerciseId: ex.exercise_id,
    name: ex.exercises?.name ?? 'Ejercicio',
    muscleGroup: ex.exercises?.muscle_group ?? '',
    type: (ex.exercises?.type as 'strength' | 'cardio') ?? 'strength',
    order: ex.order,
    plannedSets: ex.sets,
    plannedRepsMin: ex.reps_min ?? null,
    plannedRepsMax: ex.reps_max ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
    restSeconds: ex.rest_seconds ?? null,
    videoUrl: ex.exercises?.video_url ?? null,
    loggedSets: setsByExId.get(ex.id) ?? [],
  }))

  return {
    sessionId: session.id,
    clientPlanDayId: session.client_plan_day_id,
    status: session.status as 'in_progress' | 'completed',
    exercises,
  }
}

export type PrevSetEntry = {
  weightKg: number | null
  repsPerformed: number | null
}

export async function getPrevSessionSets(
  clientId: string,
  exerciseIds: string[],
  currentSessionId: string
): Promise<Record<string, PrevSetEntry>> {
  if (exerciseIds.length === 0) return {}

  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .neq('id', currentSessionId)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (!sessions?.length) return {}

  const sessionIds = sessions.map((s) => s.id)

  const { data: sets } = await supabase
    .from('session_sets')
    .select(
      'set_number, weight_kg, reps_performed, session_id, client_plan_day_exercises(exercise_id)'
    )
    .in('session_id', sessionIds)
    .eq('completed', true)

  if (!sets?.length) return {}

  const sessionRank = new Map(sessions.map((s, i) => [s.id, i]))
  const sorted = [...sets].sort((a, b) => {
    const ra = sessionRank.get(a.session_id) ?? 999
    const rb = sessionRank.get(b.session_id) ?? 999
    return ra - rb
  })

  const exerciseIdSet = new Set(exerciseIds)
  const result: Record<string, PrevSetEntry> = {}

  for (const set of sorted) {
    const exId = (
      set.client_plan_day_exercises as { exercise_id: string } | null
    )?.exercise_id
    if (!exId || !exerciseIdSet.has(exId)) continue
    const key = `${exId}:${set.set_number}`
    if (result[key]) continue
    result[key] = {
      weightKg: set.weight_kg ?? null,
      repsPerformed: set.reps_performed ?? null,
    }
  }

  return result
}
