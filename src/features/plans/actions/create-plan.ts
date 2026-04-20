'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  insertPlanWeekTree,
  validatePlanBuilderForCoach,
} from '@/features/plans/plan-builder-persist'

export type CreatePlanState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function createPlanAction(
  _prevState: CreatePlanState,
  formData: FormData
): Promise<CreatePlanState> {
  const payloadRaw = formData.get('planPayload')
  if (typeof payloadRaw !== 'string') {
    return { success: false, error: 'Payload inválido' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(payloadRaw)
  } catch {
    return { success: false, error: 'Payload inválido (JSON)' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const validated = await validatePlanBuilderForCoach(supabase, user.id, parsedJson)
  if (!validated.ok) return { success: false, error: validated.error }
  const { payload } = validated.data

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      coach_id: user.id,
      name: payload.name,
      description: payload.description ?? null,
      weeks: payload.weeks,
    })
    .select('id')
    .single()

  if (planError || !plan) return { success: false, error: 'Error al crear el plan' }

  const inserted = await insertPlanWeekTree(supabase, plan.id, payload.planWeeks)
  if (!inserted.ok) {
    await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
    return { success: false, error: inserted.error }
  }

  revalidatePath('/coach/library/plans')
  revalidatePath(`/coach/library/plans/${plan.id}`)

  return { success: true, planId: plan.id }
}
