'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClientSchema } from '@/features/clients/schemas'
import type { CreateClientState } from '@/features/clients/types'

export type { CreateClientState } from '@/features/clients/types'

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

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', coachUser.id)
    .single()
  if (coachProfile?.role !== 'coach') return { success: false, error: 'No autorizado' }

  const supabaseAdmin = createAdminClient()

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: { role: 'client', full_name: result.data.fullName },
  })

  if (authError || !newUser.user) {
    return { success: false, error: 'No se pudo crear la cuenta. Verificá que el email no esté en uso.' }
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: newUser.user.id, full_name: result.data.fullName, role: 'client', coach_id: coachUser.id })

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
    await supabaseAdmin.from('profiles').delete().eq('id', newUser.user.id)
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Error al guardar el perfil del cliente' }
  }

  return { success: true, clientId: newUser.user.id, clientName: result.data.fullName }
}
