'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteExerciseAction(exerciseId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // ON DELETE RESTRICT en plan_day_exercises y client_plan_day_exercises
  // Si el ejercicio está en uso, Postgres retorna error 23503
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('coach_id', user.id)

  if (error) {
    if (error.code === '23503') {
      return { error: 'No se puede eliminar: el ejercicio está en uso en un plan' }
    }
    return { error: 'Error al eliminar el ejercicio' }
  }

  return { success: true }
}
