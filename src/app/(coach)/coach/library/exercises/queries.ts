import { createClient } from '@/lib/supabase/server'

export type ExerciseRow = {
  id:           string
  name:         string
  muscle_group: string
  type:         string
}

export async function getCoachExercises(coachId: string): Promise<ExerciseRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, type')
    .eq('coach_id', coachId)
    .order('name')

  if (error || !data) return []
  return data
}

export type ExerciseEditRow = ExerciseRow & { video_url: string | null }

export async function getExerciseForEdit(
  coachId: string,
  exerciseId: string
): Promise<ExerciseEditRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, type, video_url')
    .eq('id', exerciseId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null
  return data as ExerciseEditRow
}
