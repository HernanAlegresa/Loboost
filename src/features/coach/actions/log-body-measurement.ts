'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { bodyMeasurementSchema } from '@/features/coach/schemas'

export async function logBodyMeasurementAction(formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    date: formData.get('date'),
    weightKg: formData.get('weightKg') || undefined,
    notes: formData.get('notes') || undefined,
  }

  const result = bodyMeasurementSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // Verificar que el cliente pertenece al coach
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', result.data.clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!clientProfile) return { error: 'Cliente no encontrado' }

  // El coach registra mediciones en nombre del cliente — service role para bypassear RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from('body_measurements')
    .insert({
      client_id: result.data.clientId,
      date: result.data.date,
      weight_kg: result.data.weightKg ?? null,
      notes: result.data.notes ?? null,
    })

  if (error) return { error: 'Error al registrar la medición' }

  return { success: true }
}
