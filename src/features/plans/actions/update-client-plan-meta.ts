'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { calculateEndDate } from '@/features/plans/calculate-end-date'
import { computeDayDate } from '@/features/clients/utils/training-utils'

const updateClientPlanMetaSchema = z.object({
  clientPlanId: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido'),
  weeks: z.coerce.number().int().min(1).max(60),
  startDate: z.string().date(),
})

export type UpdateClientPlanMetaState =
  | { success: true }
  | { success: false; error: string }
  | null

export async function updateClientPlanMetaAction(
  _prevState: UpdateClientPlanMetaState,
  formData: FormData
): Promise<UpdateClientPlanMetaState> {
  const raw = {
    clientPlanId: formData.get('clientPlanId'),
    name: formData.get('name'),
    weeks: formData.get('weeks'),
    startDate: formData.get('startDate'),
  }

  const result = updateClientPlanMetaSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]!.message }
  }

  const { clientPlanId, name, weeks, startDate } = result.data

  const supabase = await createClient()
  const {
    data: { user: coachUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, coach_id, weeks, start_date')
    .eq('id', clientPlanId)
    .eq('coach_id', coachUser.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return { success: false, error: 'Plan no encontrado' }

  // Reduce weeks: guard against removing days with completed sessions
  if (weeks < plan.weeks) {
    const { data: daysToRemove } = await supabase
      .from('client_plan_days')
      .select('id')
      .eq('client_plan_id', clientPlanId)
      .gt('week_number', weeks)

    if (daysToRemove && daysToRemove.length > 0) {
      const dayIds = daysToRemove.map((d) => d.id)

      const { data: completedSessions } = await supabase
        .from('sessions')
        .select('id')
        .in('client_plan_day_id', dayIds)
        .not('completed_at', 'is', null)

      if (completedSessions && completedSessions.length > 0) {
        return {
          success: false,
          error: 'No se pueden eliminar semanas que tienen sesiones completadas.',
        }
      }

      const { error: deleteError } = await supabase
        .from('client_plan_days')
        .delete()
        .in('id', dayIds)

      if (deleteError) return { success: false, error: 'Error al reducir las semanas del plan' }
    }
  }

  // Recalculate scheduled_date for all days when startDate changes
  if (startDate !== plan.start_date) {
    const { data: allDays } = await supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week')
      .eq('client_plan_id', clientPlanId)

    if (allDays && allDays.length > 0) {
      for (const day of allDays) {
        await supabase
          .from('client_plan_days')
          .update({ scheduled_date: computeDayDate(startDate, day.week_number, day.day_of_week) })
          .eq('id', day.id)
      }
    }
  }

  const endDate = calculateEndDate(new Date(startDate), weeks)

  const { error: updateError } = await supabase
    .from('client_plans')
    .update({
      name,
      weeks,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
    })
    .eq('id', clientPlanId)

  if (updateError) return { success: false, error: 'Error al guardar los cambios del plan' }

  return { success: true }
}
