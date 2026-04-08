'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/features/auth/schemas'
import { getUserRole } from '@/lib/auth/roles'

export async function signIn(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { error: 'Email o contraseña incorrectos' }
  }

  const role = await getUserRole()

  if (role === 'coach') redirect('/coach/dashboard')
  if (role === 'client') redirect('/client/dashboard')

  redirect('/')
}
