'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/features/clients/schemas'
import type { Database } from '@/types/database'

export type CreateClientState =
  | { success: true; clientId: string; clientName: string }
  | { success: false; error: string }
  | null

export async function createClientAction(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const raw = {
    fullName:        formData.get('fullName'),
    email:           formData.get('email'),
    password:        formData.get('password'),
    age:             formData.get('age'),
    sex:             formData.get('sex'),
    goal:            formData.get('goal'),
    weightKg:        formData.get('weightKg'),
    heightCm:        formData.get('heightCm'),
    experienceLevel: formData.get('experienceLevel'),
    daysPerWeek:     formData.get('daysPerWeek'),
    injuries:        formData.get('injuries'),
  }

  const result = createClientSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser }, error: authGetError } = await supabase.auth.getUser()
  if (authGetError || !coachUser) return { success: false, error: 'No autenticado' }

  const supabaseAdmin = createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: { role: 'client', full_name: result.data.fullName },
  })

  if (authError || !newUser.user) {
    return { success: false, error: authError?.message ?? 'Error al crear el usuario' }
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: result.data.fullName, role: 'client', coach_id: coachUser.id })
    .eq('id', newUser.user.id)

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Error al configurar el perfil del cliente' }
  }

  const { error: clientProfileError } = await supabaseAdmin
    .from('client_profiles')
    .insert({
      id:               newUser.user.id,
      age:              result.data.age,
      sex:              result.data.sex,
      goal:             result.data.goal,
      weight_kg:        result.data.weightKg,
      height_cm:        result.data.heightCm,
      experience_level: result.data.experienceLevel,
      days_per_week:    result.data.daysPerWeek,
      injuries:         result.data.injuries,
    })

  if (clientProfileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Error al guardar el perfil del cliente' }
  }

  return { success: true, clientId: newUser.user.id, clientName: result.data.fullName }
}
