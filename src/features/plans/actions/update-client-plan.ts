'use server'

import { createClient } from '@/lib/supabase/server'
import { updateClientPlanExerciseSchema } from '@/features/plans/schemas'
import type { Database } from '@/types/database'

type ClientPlanDayExerciseUpdate = Database['public']['Tables']['client_plan_day_exercises']['Update']

export async function updateClientPlanExerciseAction(
  clientPlanDayExerciseId: string,
  formData: FormData
) {
  const raw = {
    sets: formData.get('sets') || undefined,
    reps: formData.get('reps') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
    restSeconds: formData.get('restSeconds') || undefined,
    order: formData.get('order') || undefined,
  }

  const result = updateClientPlanExerciseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: ClientPlanDayExerciseUpdate = {}
  if (result.data.sets !== undefined) updates.sets = result.data.sets
  if (result.data.reps !== undefined) updates.reps = result.data.reps
  if (result.data.durationSeconds !== undefined) updates.duration_seconds = result.data.durationSeconds
  if (result.data.restSeconds !== undefined) updates.rest_seconds = result.data.restSeconds
  if (result.data.order !== undefined) updates.order = result.data.order

  if (Object.keys(updates).length === 0) return { success: true }

  // RLS garantiza que solo el coach dueño del plan puede actualizar
  const { error } = await supabase
    .from('client_plan_day_exercises')
    .update(updates)
    .eq('id', clientPlanDayExerciseId)

  if (error) return { error: 'Error al actualizar el ejercicio del cliente' }

  return { success: true }
}
