'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/features/clients/schemas'

export async function createClientAction(formData: FormData) {
  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    age: formData.get('age'),
    sex: formData.get('sex'),
    goal: formData.get('goal'),
    weightKg: formData.get('weightKg'),
    heightCm: formData.get('heightCm'),
    experienceLevel: formData.get('experienceLevel'),
    daysPerWeek: formData.get('daysPerWeek'),
    injuries: formData.get('injuries') || undefined,
  }

  const result = createClientSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser } } = await supabase.auth.getUser()
  if (!coachUser) return { error: 'No autenticado' }

  // Admin client: crea el usuario sin cerrar la sesión del coach
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: {
      role: 'client',
      full_name: result.data.fullName,
    },
  })

  if (authError || !newUser.user) {
    return { error: authError?.message ?? 'Error al crear el usuario' }
  }

  // Asignar coach_id al profile creado por el trigger
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ coach_id: coachUser.id })
    .eq('id', newUser.user.id)

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'Error al asignar el coach al cliente' }
  }

  // Crear client_profile con datos fitness
  const { error: clientProfileError } = await supabaseAdmin
    .from('client_profiles')
    .insert({
      id: newUser.user.id,
      age: result.data.age,
      sex: result.data.sex,
      goal: result.data.goal,
      weight_kg: result.data.weightKg,
      height_cm: result.data.heightCm,
      experience_level: result.data.experienceLevel,
      days_per_week: result.data.daysPerWeek,
      injuries: result.data.injuries ?? null,
    })

  if (clientProfileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'Error al guardar el perfil del cliente' }
  }

  return { success: true, clientId: newUser.user.id }
}
