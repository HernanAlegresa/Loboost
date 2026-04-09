'use server'

import { createClient } from '@/lib/supabase/server'
import { startSessionSchema } from '@/features/training/schemas'

export async function startSessionAction(formData: FormData) {
  const raw = { clientPlanDayId: formData.get('clientPlanDayId') }

  const result = startSessionSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // Si ya existe una sesión para este día (in_progress o completed), retornarla
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('client_plan_day_id', result.data.clientPlanDayId)
    .eq('client_id', user.id)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle()

  if (existing) {
    return { success: true, sessionId: existing.id, resumed: true }
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      client_id: user.id,
      client_plan_day_id: result.data.clientPlanDayId,
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error || !session) return { error: 'Error al iniciar la sesión' }

  return { success: true, sessionId: session.id, resumed: false }
}
