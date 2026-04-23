'use server'

import { createClient } from '@/lib/supabase/server'
import { computeDayDate, getTodayISO } from '@/features/clients/utils/training-utils'

type SetInput = {
  clientPlanDayExerciseId: string
  setNumber: number
  weightKg?: number | null
  repsPerformed?: number | null
  durationSeconds?: number | null
}

type LogManualResult =
  | { success: true; sessionId: string }
  | { error: string }

export async function logManualSessionAction(
  clientPlanDayId: string,
  sets: SetInput[]
): Promise<LogManualResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { data: planDay } = await supabase
    .from('client_plan_days')
    .select('week_number, day_of_week, client_plans(start_date)')
    .eq('id', clientPlanDayId)
    .single()

  if (planDay) {
    const planData = Array.isArray(planDay.client_plans)
      ? planDay.client_plans[0]
      : planDay.client_plans
    if (planData?.start_date) {
      const sessionDate = computeDayDate(planData.start_date, planDay.week_number, planDay.day_of_week)
      if (sessionDate > getTodayISO()) {
        return { error: 'No podés registrar días futuros' }
      }
    }
  }

  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('client_plan_day_id', clientPlanDayId)
    .eq('client_id', user.id)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle()

  if (existing?.status === 'completed') {
    return { error: 'Este entrenamiento ya fue registrado' }
  }

  let sessionId: string

  if (existing?.status === 'in_progress') {
    sessionId = existing.id
    await supabase.from('session_sets').delete().eq('session_id', sessionId)
  } else {
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        client_id: user.id,
        client_plan_day_id: clientPlanDayId,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (insertError || !session) return { error: 'Error al crear la sesión' }
    sessionId = session.id
  }

  if (sets.length > 0) {
    const { error: setsError } = await supabase.from('session_sets').insert(
      sets.map((s) => ({
        session_id: sessionId,
        client_plan_day_exercise_id: s.clientPlanDayExerciseId,
        set_number: s.setNumber,
        weight_kg: s.weightKg ?? null,
        reps_performed: s.repsPerformed ?? null,
        duration_seconds: s.durationSeconds ?? null,
        completed: true,
        logged_at: new Date().toISOString(),
      }))
    )

    if (setsError) return { error: 'Error al guardar las series' }
  }

  return { success: true, sessionId }
}
