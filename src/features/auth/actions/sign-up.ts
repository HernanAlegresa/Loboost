'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { registerSchema } from '@/features/auth/schemas'

export async function signUp(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        role: 'coach',
        full_name: result.data.fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/coach/dashboard')
}
