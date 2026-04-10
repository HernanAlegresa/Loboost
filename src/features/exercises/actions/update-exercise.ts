'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export async function updateExerciseAction(exerciseId: string, formData: FormData) {
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
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

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

  if (error) return { error: 'Error al actualizar el ejercicio' }

  return { success: true }
}
