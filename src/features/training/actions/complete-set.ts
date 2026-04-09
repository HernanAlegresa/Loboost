'use server'

import { createClient } from '@/lib/supabase/server'
import { completeSetSchema } from '@/features/training/schemas'

export async function completeSetAction(formData: FormData) {
  const raw = {
    sessionId: formData.get('sessionId'),
    clientPlanDayExerciseId: formData.get('clientPlanDayExerciseId'),
    setNumber: formData.get('setNumber'),
    weightKg: formData.get('weightKg') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
  }

  const result = completeSetSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  // Upsert: si ya existe esa serie la actualiza, si no la crea
  const { error } = await supabase
    .from('session_sets')
    .upsert(
      {
        session_id: result.data.sessionId,
        client_plan_day_exercise_id: result.data.clientPlanDayExerciseId,
        set_number: result.data.setNumber,
        weight_kg: result.data.weightKg ?? null,
        duration_seconds: result.data.durationSeconds ?? null,
        completed: true,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,client_plan_day_exercise_id,set_number' }
    )

  if (error) return { error: 'Error al registrar la serie' }

  return { success: true }
}
