'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function updateSetAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const sessionId = formData.get('sessionId') as string
  const clientPlanDayExerciseId = formData.get('clientPlanDayExerciseId') as string
  const setNumber = Number(formData.get('setNumber'))
  const rawWeight = formData.get('weightKg')
  const rawDuration = formData.get('durationSeconds')

  const supabase = await createClient()

  // Verify session belongs to this client
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('client_id', user.id)
    .single()

  if (!session) return { success: false, error: 'Unauthorized' }

  const patch: { weight_kg?: number | null; duration_seconds?: number | null } = {}

  if (rawWeight !== null) {
    patch.weight_kg = rawWeight === '' ? null : Number(rawWeight)
  }
  if (rawDuration !== null) {
    patch.duration_seconds = rawDuration === '' ? null : Number(rawDuration)
  }

  const { error } = await supabase
    .from('session_sets')
    .update(patch)
    .eq('session_id', sessionId)
    .eq('client_plan_day_exercise_id', clientPlanDayExerciseId)
    .eq('set_number', setNumber)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
