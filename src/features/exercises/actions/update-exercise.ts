'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export type UpdateExerciseState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function updateExerciseAction(
  _prev: UpdateExerciseState,
  formData: FormData
): Promise<UpdateExerciseState> {
  const exerciseId = formData.get('exerciseId')
  if (typeof exerciseId !== 'string' || exerciseId.length < 10) {
    return { success: false, error: 'Ejercicio inválido' }
  }

  const videoRaw = formData.get('videoUrl')
  const raw = {
    name: formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    category: formData.get('category'),
    type: formData.get('type'),
    videoUrl:
      typeof videoRaw === 'string' && videoRaw.trim() === '' ? undefined : videoRaw || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('exercises')
    .update({
      name: result.data.name,
      muscle_group: result.data.muscleGroup,
      category: result.data.category,
      type: result.data.type,
      video_url: result.data.videoUrl ?? null,
    })
    .eq('id', exerciseId)
    .eq('coach_id', user.id)

  if (error) return { success: false, error: 'Error al actualizar el ejercicio' }

  return { success: true }
}
