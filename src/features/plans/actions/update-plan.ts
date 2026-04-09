'use server'

import { createClient } from '@/lib/supabase/server'
import { updatePlanSchema } from '@/features/plans/schemas'
import type { Database } from '@/types/database'

type PlanUpdate = Database['public']['Tables']['plans']['Update']

export async function updatePlanAction(planId: string, formData: FormData) {
  const raw = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    weeks: formData.get('weeks') || undefined,
  }

  const result = updatePlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: PlanUpdate = {}
  if (result.data.name) updates.name = result.data.name
  if (result.data.description !== undefined) updates.description = result.data.description
  if (result.data.weeks) updates.weeks = result.data.weeks

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', planId)

  if (error) return { error: 'Error al actualizar el plan' }

  return { success: true }
}
