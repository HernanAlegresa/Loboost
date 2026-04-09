import { createClient } from '@/lib/supabase/server'

export type SetRecord = {
  date: string
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
}

export type ExerciseProgress = {
  exerciseId: string
  exerciseName: string
  records: SetRecord[]
}

export async function getExerciseProgress(
  clientId: string,
  exerciseId: string
): Promise<ExerciseProgress | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('session_sets')
    .select(`
      set_number,
      weight_kg,
      duration_seconds,
      logged_at,
      client_plan_day_exercises!inner (
        exercise_id,
        exercises!inner ( id, name )
      ),
      sessions!inner (
        date,
        client_id
      )
    `)
    .eq('sessions.client_id', clientId)
    .eq('client_plan_day_exercises.exercise_id', exerciseId)
    .eq('completed', true)
    .order('logged_at', { ascending: true })

  if (error || !data || data.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = data[0] as any
  const exerciseName = first.client_plan_day_exercises?.exercises?.name ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: SetRecord[] = data.map((row: any) => ({
    date: row.sessions?.date ?? '',
    setNumber: row.set_number,
    weightKg: row.weight_kg,
    durationSeconds: row.duration_seconds,
  }))

  return { exerciseId, exerciseName, records }
}

export async function getClientLastSession(clientId: string): Promise<Date | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sessions')
    .select('completed_at')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.completed_at) return null
  return new Date(data.completed_at)
}
