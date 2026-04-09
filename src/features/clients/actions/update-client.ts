'use server'

import { createClient } from '@/lib/supabase/server'
import { updateClientProfileSchema } from '@/features/clients/schemas'
import type { Database } from '@/types/database'

type ClientProfileUpdate = Database['public']['Tables']['client_profiles']['Update']

export async function updateClientAction(clientId: string, formData: FormData) {
  const raw = {
    age: formData.get('age') || undefined,
    sex: formData.get('sex') || undefined,
    goal: formData.get('goal') || undefined,
    weightKg: formData.get('weightKg') || undefined,
    heightCm: formData.get('heightCm') || undefined,
    experienceLevel: formData.get('experienceLevel') || undefined,
    daysPerWeek: formData.get('daysPerWeek') || undefined,
    injuries: formData.get('injuries') || undefined,
  }

  const result = updateClientProfileSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: ClientProfileUpdate = {}
  if (result.data.age !== undefined) updates.age = result.data.age
  if (result.data.sex !== undefined) updates.sex = result.data.sex
  if (result.data.goal !== undefined) updates.goal = result.data.goal
  if (result.data.weightKg !== undefined) updates.weight_kg = result.data.weightKg
  if (result.data.heightCm !== undefined) updates.height_cm = result.data.heightCm
  if (result.data.experienceLevel !== undefined) updates.experience_level = result.data.experienceLevel
  if (result.data.daysPerWeek !== undefined) updates.days_per_week = result.data.daysPerWeek
  if (result.data.injuries !== undefined) updates.injuries = result.data.injuries

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await supabase
    .from('client_profiles')
    .update(updates)
    .eq('id', clientId)

  if (error) return { error: 'Error al actualizar el cliente' }

  return { success: true }
}
