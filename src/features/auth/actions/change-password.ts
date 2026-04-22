'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

export type ChangePasswordState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const raw = {
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: result.data.password })

  if (error) return { success: false, error: 'No se pudo actualizar la contraseña. Intentá de nuevo.' }

  return { success: true }
}
