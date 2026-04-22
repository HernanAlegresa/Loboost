'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(
  sessionId: string,
  rpe?: number,
  notes?: string,
  energyLevel?: number,
  sleepQuality?: number,
  sorenessLevel?: number
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      rpe: rpe ?? null,
      notes: notes ?? null,
      energy_level: energyLevel ?? null,
      sleep_quality: sleepQuality ?? null,
      soreness_level: sorenessLevel ?? null,
    })
    .eq('id', sessionId)
    .eq('client_id', user.id)

  if (error) return { error: 'Error al completar la sesión' }

  return { success: true }
}
