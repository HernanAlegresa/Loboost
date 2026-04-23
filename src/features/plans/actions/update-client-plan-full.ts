'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type UpdateClientPlanFullState =
  | { success: true }
  | { success: false; error: string }
  | null

type ExerciseChange = {
  dbId: string | null
  exerciseId: string
  order: number
  sets: number
  repsMin: number | null
  repsMax: number | null
  restSeconds: number | null
}

type DayChange = {
  clientPlanDayId: string
  exercises: ExerciseChange[]
}

type UpdatePayload = {
  clientPlanId: string
  days: DayChange[]
}

export async function updateClientPlanFullAction(
  _prev: UpdateClientPlanFullState,
  formData: FormData
): Promise<UpdateClientPlanFullState> {
  const payloadRaw = formData.get('planPayload')
  if (typeof payloadRaw !== 'string') return { success: false, error: 'Payload inválido' }

  let parsed: unknown
  try {
    parsed = JSON.parse(payloadRaw)
  } catch {
    return { success: false, error: 'Payload inválido (JSON)' }
  }

  const payload = parsed as UpdatePayload
  if (
    typeof payload?.clientPlanId !== 'string' ||
    !Array.isArray(payload?.days)
  ) {
    return { success: false, error: 'Payload inválido' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data: plan, error: planErr } = await supabase
    .from('client_plans')
    .select('id, client_id')
    .eq('id', payload.clientPlanId)
    .eq('coach_id', user.id)
    .single()

  if (planErr || !plan) return { success: false, error: 'Plan no encontrado' }

  const incomingDayIds = payload.days.map((d) => d.clientPlanDayId)
  const { data: validDaysRows } = await supabase
    .from('client_plan_days')
    .select('id')
    .eq('client_plan_id', payload.clientPlanId)
    .in('id', incomingDayIds)

  const validDayIds = new Set((validDaysRows ?? []).map((d) => d.id))
  const hasInvalidDay = incomingDayIds.some((id) => !validDayIds.has(id))
  if (hasInvalidDay) return { success: false, error: 'Días inválidos' }

  for (const day of payload.days) {
    const { data: existing } = await supabase
      .from('client_plan_day_exercises')
      .select('id')
      .eq('client_plan_day_id', day.clientPlanDayId)

    const existingIds = new Set((existing ?? []).map((e) => e.id))
    const keepIds = new Set(
      day.exercises.filter((e) => e.dbId !== null).map((e) => e.dbId!)
    )
    const idsToDelete = [...existingIds].filter((id) => !keepIds.has(id))

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('client_plan_day_exercises')
        .delete()
        .in('id', idsToDelete)
      if (delErr) return { success: false, error: 'Error al eliminar ejercicios' }
    }

    for (const ex of day.exercises) {
      if (ex.dbId) {
        const { error: upErr } = await supabase
          .from('client_plan_day_exercises')
          .update({
            exercise_id: ex.exerciseId,
            sets: ex.sets,
            reps_min: ex.repsMin,
            reps_max: ex.repsMax,
            rest_seconds: ex.restSeconds,
            order: ex.order,
          })
          .eq('id', ex.dbId)
        if (upErr) return { success: false, error: 'Error al actualizar ejercicio' }
      } else {
        const { error: insErr } = await supabase
          .from('client_plan_day_exercises')
          .insert({
            client_plan_day_id: day.clientPlanDayId,
            exercise_id: ex.exerciseId,
            sets: ex.sets,
            reps_min: ex.repsMin,
            reps_max: ex.repsMax,
            rest_seconds: ex.restSeconds,
            order: ex.order,
          })
        if (insErr) return { success: false, error: 'Error al agregar ejercicio' }
      }
    }
  }

  revalidatePath(`/coach/clients/${plan.client_id}`)
  revalidatePath(`/coach/clients/${plan.client_id}/plan/edit`)

  return { success: true }
}
