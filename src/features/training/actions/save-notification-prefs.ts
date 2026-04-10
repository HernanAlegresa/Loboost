'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveNotificationPrefsAction(
  reminders: boolean,
  coachMsgs: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      client_id: user.id,
      reminders,
      coach_msgs: coachMsgs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )

  if (error) return { error: 'Error al guardar preferencias' }
  return { success: true }
}
