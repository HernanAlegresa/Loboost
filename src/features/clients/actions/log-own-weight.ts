'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  weightKg: z.coerce.number().positive().max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function logOwnWeightAction(formData: FormData) {
  const raw = {
    weightKg: formData.get('weightKg'),
    date: formData.get('date'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('body_measurements')
    .upsert(
      { client_id: user.id, date: result.data.date, weight_kg: result.data.weightKg },
      { onConflict: 'client_id,date' }
    )

  if (error) return { error: 'Error al registrar el peso' }

  revalidatePath('/client/settings')
  revalidatePath('/client/progress')
  return { success: true }
}
