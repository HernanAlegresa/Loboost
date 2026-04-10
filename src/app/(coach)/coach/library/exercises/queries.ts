import { createClient } from '@/lib/supabase/server'

export type ExerciseRow = {
  id: string
  name: string
  muscle_group: string
  category: string
  type: string
}

export async function getCoachExercises(coachId: string): Promise<ExerciseRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, category, type')
    .eq('coach_id', coachId)
    .order('name')

  if (error || !data) return []
  return data
}
