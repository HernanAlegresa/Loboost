'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'

const schema = z.object({
  clientPlanId: z.string().uuid(),
  weekNumber: z.coerce.number().int().min(1).max(60),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
})

export type AddClientPlanDayState =
  | { success: true; dayId: string }
  | { success: false; error: string }
  | null

export async function addClientPlanDayAction(
  _prevState: AddClientPlanDayState,
  formData: FormData
): Promise<AddClientPlanDayState> {
  const raw = {
    clientPlanId: formData.get('clientPlanId'),
    weekNumber: formData.get('weekNumber'),
    dayOfWeek: formData.get('dayOfWeek'),
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]!.message }
  }

  const { clientPlanId, weekNumber, dayOfWeek } = result.data

  const supabase = await createClient()
  const { data: { user: coachUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, coach_id, start_date, weeks')
    .eq('id', clientPlanId)
    .eq('coach_id', coachUser.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return { success: false, error: 'Plan no encontrado' }
  if (!plan.start_date) return { success: false, error: 'El plan no tiene fecha de inicio. Editá los datos del plan primero.' }
  if (weekNumber > plan.weeks) return { success: false, error: 'Semana fuera del rango del plan' }

  const { data: existing } = await supabase
    .from('client_plan_days')
    .select('id')
    .eq('client_plan_id', clientPlanId)
    .eq('week_number', weekNumber)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (existing) return { success: false, error: 'Este día ya existe en la semana' }

  const { count } = await supabase
    .from('client_plan_days')
    .select('id', { count: 'exact', head: true })
    .eq('client_plan_id', clientPlanId)
    .eq('week_number', weekNumber)

  const scheduledDate = computeDayDate(plan.start_date, weekNumber, dayOfWeek)

  const { data: newDay, error: insertError } = await supabase
    .from('client_plan_days')
    .insert({
      client_plan_id: clientPlanId,
      week_number: weekNumber,
      day_of_week: dayOfWeek,
      order: (count ?? 0) + 1,
      scheduled_date: scheduledDate,
    })
    .select('id')
    .single()

  if (insertError || !newDay) {
    return { success: false, error: 'Error al agregar el día' }
  }

  return { success: true, dayId: newDay.id }
}
