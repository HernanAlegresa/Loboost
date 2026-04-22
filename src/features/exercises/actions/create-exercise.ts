'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export type CreateExerciseState =
  | { success: true; exerciseId: string }
  | { success: false; error: string }
  | null

export async function createExerciseAction(
  _prevState: CreateExerciseState,
  formData: FormData
): Promise<CreateExerciseState> {
  const videoRaw = formData.get('videoUrl')
  const raw = {
    name:        formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    type:        formData.get('type'),
    videoUrl:
      typeof videoRaw === 'string' && videoRaw.trim() === '' ? undefined : videoRaw || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      coach_id:     user.id,
      name:         result.data.name,
      muscle_group: result.data.muscleGroup,
      type:         result.data.type,
      video_url:    result.data.videoUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: 'Error al crear el ejercicio' }
  return { success: true, exerciseId: data.id }
}
