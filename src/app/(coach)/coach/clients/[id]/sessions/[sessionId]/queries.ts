import { createClient } from '@/lib/supabase/server'

export type SessionSetDetail = {
  setNumber: number
  weightKg: number | null
  repsPerformed: number | null
  durationSeconds: number | null
  completed: boolean
}

export type SessionExerciseDetail = {
  clientPlanDayExerciseId: string
  name: string
  type: 'strength' | 'cardio'
  plannedSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  sets: SessionSetDetail[]
}

export type SessionDetail = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  rpe: number | null
  notes: string | null
  energyLevel: number | null
  sleepQuality: number | null
  sorenessLevel: number | null
  weekNumber: number
  dayOfWeek: number
  exercises: SessionExerciseDetail[]
}

export async function getSessionDetailForCoach(
  sessionId: string,
  clientId: string,
  coachId: string
): Promise<SessionDetail | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()
  if (!profile || profile.coach_id !== coachId) return null

  const { data: session, error: sessErr } = await supabase
    .from('sessions')
    .select(`
      id, date, status, rpe, notes, energy_level, sleep_quality, soreness_level,
      client_plan_days ( day_of_week, week_number,
        client_plan_day_exercises (
          id, order, sets, reps_min, reps_max, duration_seconds,
          exercises ( name, type )
        )
      )
    `)
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .single()

  if (sessErr || !session) return null

  const { data: setsData } = await supabase
    .from('session_sets')
    .select('client_plan_day_exercise_id, set_number, weight_kg, reps_performed, duration_seconds, completed')
    .eq('session_id', sessionId)
    .order('set_number')

  const setsByExercise = new Map<string, SessionSetDetail[]>()
  for (const s of setsData ?? []) {
    if (!setsByExercise.has(s.client_plan_day_exercise_id)) {
      setsByExercise.set(s.client_plan_day_exercise_id, [])
    }
    setsByExercise.get(s.client_plan_day_exercise_id)!.push({
      setNumber: s.set_number,
      weightKg: s.weight_kg,
      repsPerformed: s.reps_performed,
      durationSeconds: s.duration_seconds,
      completed: s.completed,
    })
  }

  type RawDay = {
    day_of_week: number
    week_number: number
    client_plan_day_exercises: Array<{
      id: string
      order: number
      sets: number
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      exercises: { name: string; type: string } | null
    }>
  }

  const day = session.client_plan_days as RawDay | null

  const planExercisesSorted = [...(day?.client_plan_day_exercises ?? [])].sort((a, b) => a.order - b.order)

  const exercises: SessionExerciseDetail[] = planExercisesSorted.map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    name: ex.exercises?.name ?? 'Ejercicio',
    type: (ex.exercises?.type ?? 'strength') as 'strength' | 'cardio',
    plannedSets: ex.sets,
    plannedRepsMin: ex.reps_min,
    plannedRepsMax: ex.reps_max,
    plannedDurationSeconds: ex.duration_seconds,
    sets: setsByExercise.get(ex.id) ?? [],
  }))

  return {
    id: session.id,
    date: session.date,
    status: session.status as 'completed' | 'in_progress',
    rpe: session.rpe,
    notes: session.notes,
    energyLevel: (session as { energy_level: number | null }).energy_level ?? null,
    sleepQuality: (session as { sleep_quality: number | null }).sleep_quality ?? null,
    sorenessLevel: (session as { soreness_level: number | null }).soreness_level ?? null,
    weekNumber: day?.week_number ?? 0,
    dayOfWeek: day?.day_of_week ?? 0,
    exercises,
  }
}
