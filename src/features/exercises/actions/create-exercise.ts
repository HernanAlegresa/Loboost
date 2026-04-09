'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export async function createExerciseAction(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    category: formData.get('category'),
    type: formData.get('type'),
    videoUrl: formData.get('videoUrl') || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      coach_id: user.id,
      name: result.data.name,
      muscle_group: result.data.muscleGroup,
      category: result.data.category,
      type: result.data.type,
      video_url: result.data.videoUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al crear el ejercicio' }

  return { success: true, exerciseId: data.id }
}
