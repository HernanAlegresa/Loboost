'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  clientPlanDayId: z.string().uuid(),
})

export type DeleteClientPlanDayState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function deleteClientPlanDayAction(
  _prev: DeleteClientPlanDayState,
  formData: FormData
): Promise<DeleteClientPlanDayState> {
  const raw = { clientPlanDayId: formData.get('clientPlanDayId') }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]!.message }
  }
  const { clientPlanDayId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user: coachUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: dayRow, error: dayErr } = await supabase
    .from('client_plan_days')
    .select('id, client_plan_id')
    .eq('id', clientPlanDayId)
    .single()

  if (dayErr || !dayRow) return { success: false, error: 'Día no encontrado' }

  const { data: plan, error: planErr } = await supabase
    .from('client_plans')
    .select('id, client_id, coach_id')
    .eq('id', dayRow.client_plan_id)
    .single()

  if (planErr || !plan || plan.coach_id !== coachUser.id) {
    return { success: false, error: 'No autorizado' }
  }

  const { data: completed } = await supabase
    .from('sessions')
    .select('id')
    .eq('client_plan_day_id', clientPlanDayId)
    .not('completed_at', 'is', null)
    .limit(1)

  if (completed && completed.length > 0) {
    return { success: false, error: 'Este día tiene sesiones completadas y no puede eliminarse.' }
  }

  const { error: delErr } = await supabase.from('client_plan_days').delete().eq('id', clientPlanDayId)
  if (delErr) return { success: false, error: 'Error al eliminar el día' }

  revalidatePath(`/coach/clients/${plan.client_id}`)
  revalidatePath(`/coach/clients/${plan.client_id}/plan/edit`)

  return { success: true }
}
