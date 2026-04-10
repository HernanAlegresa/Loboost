'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  deletePlanDayTree,
  insertPlanDayTree,
  validatePlanBuilderForCoach,
} from '@/features/plans/plan-builder-persist'

export type UpdatePlanFullState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function updatePlanFullAction(
  _prev: UpdatePlanFullState,
  formData: FormData
): Promise<UpdatePlanFullState> {
  const planIdRaw = formData.get('planId')
  if (typeof planIdRaw !== 'string' || planIdRaw.length < 10) {
    return { success: false, error: 'Plan inválido' }
  }
  const planId = planIdRaw

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

  const { data: owned, error: ownErr } = await supabase
    .from('plans')
    .select('id')
    .eq('id', planId)
    .eq('coach_id', user.id)
    .single()

  if (ownErr || !owned) return { success: false, error: 'Plan no encontrado' }

  const validated = await validatePlanBuilderForCoach(supabase, user.id, parsedJson)
  if (!validated.ok) return { success: false, error: validated.error }
  const { sortedDays, payload } = validated.data

  const { error: metaErr } = await supabase
    .from('plans')
    .update({
      name: payload.name,
      description: payload.description ?? null,
      weeks: payload.weeks,
    })
    .eq('id', planId)
    .eq('coach_id', user.id)

  if (metaErr) return { success: false, error: 'Error al actualizar el plan' }

  const del = await deletePlanDayTree(supabase, planId)
  if (!del.ok) return { success: false, error: del.error }

  const ins = await insertPlanDayTree(supabase, planId, user.id, sortedDays)
  if (!ins.ok) return { success: false, error: ins.error }

  revalidatePath('/coach/library/plans')
  revalidatePath(`/coach/library/plans/${planId}`)
  revalidatePath(`/coach/library/plans/${planId}/edit`)

  return { success: true, planId }
}
