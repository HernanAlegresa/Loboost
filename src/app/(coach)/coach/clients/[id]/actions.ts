'use server'

import { createClient } from '@/lib/supabase/server'
import { getWeekTrainingData as _getWeekTrainingData } from './queries'
import type { TrainingWeekData } from '@/features/clients/types'

export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number,
  clientId: string
): Promise<TrainingWeekData> {
  return _getWeekTrainingData(clientPlanId, weekNumber, startDate, totalWeeks, clientId)
}

export async function saveCoachNoteAction(
  clientId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data: existing } = await supabase
    .from('coach_notes')
    .select('id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('coach_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { success: false, error: 'Error al guardar la nota' }
  } else {
    const { error } = await supabase
      .from('coach_notes')
      .insert({ coach_id: user.id, client_id: clientId, content })
    if (error) return { success: false, error: 'Error al guardar la nota' }
  }

  return { success: true }
}
