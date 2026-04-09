'use server'

import { createClient } from '@/lib/supabase/server'
import { coachNoteSchema } from '@/features/coach/schemas'

export async function saveCoachNoteAction(noteId: string | null, formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    content: formData.get('content'),
  }

  const result = coachNoteSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  if (noteId) {
    // Actualizar nota existente
    const { error } = await supabase
      .from('coach_notes')
      .update({
        content: result.data.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('coach_id', user.id)

    if (error) return { error: 'Error al actualizar la nota' }
    return { success: true }
  }

  // Crear nota nueva
  const { data, error } = await supabase
    .from('coach_notes')
    .insert({
      coach_id: user.id,
      client_id: result.data.clientId,
      content: result.data.content,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al guardar la nota' }

  return { success: true, noteId: data.id }
}
