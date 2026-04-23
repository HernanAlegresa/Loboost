'use server'

import { createClient } from '@/lib/supabase/server'
import { completeSetSchema } from '@/features/training/schemas'

export async function completeSetAction(
  formData: FormData
): Promise<{ success: true; isPR: boolean } | { error: string }> {
  const raw = {
    sessionId: formData.get('sessionId'),
    clientPlanDayExerciseId: formData.get('clientPlanDayExerciseId'),
    setNumber: formData.get('setNumber'),
    repsPerformed: formData.get('repsPerformed') || undefined,
    weightKg: formData.get('weightKg') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
  }

  const result = completeSetSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]!.message }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error: upsertError } = await supabase
    .from('session_sets')
    .upsert(
      {
        session_id: result.data.sessionId,
        client_plan_day_exercise_id: result.data.clientPlanDayExerciseId,
        set_number: result.data.setNumber,
        reps_performed: result.data.repsPerformed ?? null,
        weight_kg: result.data.weightKg ?? null,
        duration_seconds: result.data.durationSeconds ?? null,
        completed: true,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,client_plan_day_exercise_id,set_number' }
    )

  if (upsertError) return { error: 'Error al registrar la serie' }

  // PR check: solo para series de fuerza con peso
  if (result.data.weightKg == null) {
    return { success: true, isPR: false }
  }

  // Obtener exercise_id para esta client_plan_day_exercise
  const { data: cpde } = await supabase
    .from('client_plan_day_exercises')
    .select('exercise_id')
    .eq('id', result.data.clientPlanDayExerciseId)
    .single()

  if (!cpde) return { success: true, isPR: false }

  // Llamar RPC para obtener el máximo histórico (excluyendo sesión actual)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prevMax } = await (supabase as any).rpc('get_exercise_prev_max', {
    p_exercise_id: cpde.exercise_id,
    p_client_id: user.id,
    p_exclude_session_id: result.data.sessionId,
  })

  const isPR = prevMax != null && result.data.weightKg > (prevMax as number)

  return { success: true, isPR }
}
