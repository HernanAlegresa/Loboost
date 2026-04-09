'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('client_id', user.id) // RLS: el cliente solo puede cerrar sus propias sesiones

  if (error) return { error: 'Error al completar la sesión' }

  return { success: true }
}
