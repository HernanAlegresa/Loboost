'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coachProfileUpdateSchema } from '@/features/coach/schemas'

export type UpdateCoachProfileState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function updateCoachProfileAction(
  _prev: UpdateCoachProfileState,
  formData: FormData
): Promise<UpdateCoachProfileState> {
  const raw = { fullName: formData.get('fullName') }
  const parsed = coachProfileUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'coach') {
    return { success: false, error: 'Cuenta no válida' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', user.id)

  if (updateError) return { success: false, error: 'No se pudo guardar el perfil' }

  revalidatePath('/coach/settings')
  revalidatePath('/coach/dashboard')
  return { success: true }
}
