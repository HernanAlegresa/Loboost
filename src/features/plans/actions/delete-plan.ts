'use server'

import { createClient } from '@/lib/supabase/server'

export async function deletePlanAction(planId: string) {
  const supabase = await createClient()

  // plan_days y plan_day_exercises se eliminan en cascada
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) return { error: 'Error al eliminar el plan' }

  return { success: true }
}
