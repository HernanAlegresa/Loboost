'use server'

import { createClient } from '@/lib/supabase/server'

export type UnassignClientPlanResult =
  | { success: true }
  | { success: false; error: string }

export async function unassignClientPlanAction(
  clientPlanId: string
): Promise<UnassignClientPlanResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  // Verify ownership: client_plan must belong to a client of this coach
  const { data: clientPlan, error: fetchError } = await supabase
    .from('client_plans')
    .select('id, coach_id, status')
    .eq('id', clientPlanId)
    .eq('status', 'active')
    .single()

  if (fetchError || !clientPlan) {
    return { success: false, error: 'Plan no encontrado o ya inactivo' }
  }

  if (clientPlan.coach_id !== user.id) {
    return { success: false, error: 'No autorizado' }
  }

  const { error: updateError } = await supabase
    .from('client_plans')
    .update({ status: 'inactive' })
    .eq('id', clientPlanId)
    .eq('status', 'active')

  if (updateError) {
    return { success: false, error: 'Error al desasignar el plan' }
  }

  return { success: true }
}
