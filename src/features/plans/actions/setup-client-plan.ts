'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { calculateEndDate } from '@/features/plans/calculate-end-date'
import { computeDayDate } from '@/features/clients/utils/training-utils'

const setupClientPlanSchema = z.object({
  clientId: z.string().uuid(),
  templateId: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido'),
  weeks: z.coerce.number().int().min(1).max(60),
  startDate: z.string().date(),
})

export type SetupClientPlanState =
  | { success: true; clientPlanId: string }
  | { success: false; error: string; reason?: 'template_missing' | 'active_plan_exists' | 'validation' }
  | null

type PlanWeek = {
  id: string
  week_number: number
  plan_days: Array<{
    id: string
    day_of_week: number
    order: number
    plan_day_exercises: Array<{
      id: string
      exercise_id: string
      order: number
      sets: number
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      rest_seconds: number | null
    }>
  }>
}

export async function setupClientPlanAction(
  _prevState: SetupClientPlanState,
  formData: FormData
): Promise<SetupClientPlanState> {
  const raw = {
    clientId: formData.get('clientId'),
    templateId: formData.get('templateId'),
    name: formData.get('name'),
    weeks: formData.get('weeks'),
    startDate: formData.get('startDate'),
  }

  const result = setupClientPlanSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]!.message, reason: 'validation' }
  }

  const { clientId, templateId, name, weeks, startDate } = result.data

  const supabase = await createClient()
  const {
    data: { user: coachUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('id, coach_id, role')
    .eq('id', clientId)
    .single()

  if (
    !clientProfile ||
    clientProfile.role !== 'client' ||
    clientProfile.coach_id !== coachUser.id
  ) {
    return { success: false, error: 'Cliente no válido', reason: 'validation' }
  }

  const { data: activeClientPlan } = await supabase
    .from('client_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('coach_id', coachUser.id)
    .eq('status', 'active')
    .maybeSingle()

  if (activeClientPlan) {
    return {
      success: false,
      error: 'Este cliente ya tiene un plan activo. Revisalo desde su perfil antes de asignar otro.',
      reason: 'active_plan_exists',
    }
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select(`
      id, name, weeks,
      plan_weeks (
        id, week_number,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds
          )
        )
      )
    `)
    .eq('id', templateId)
    .eq('coach_id', coachUser.id)
    .single()

  if (planError || !plan) {
    return {
      success: false,
      error: 'El plan seleccionado ya no está disponible. Volvé y elegí otro template.',
      reason: 'template_missing',
    }
  }

  // ADR-0003: `client_plans.plan_id` is the canonical source-template reference.
  const sourceTemplatePlanId = plan.id
  const planWeeks = (plan.plan_weeks ?? []) as PlanWeek[]

  const endDate = calculateEndDate(new Date(startDate), weeks)

  const { data: clientPlan, error: clientPlanError } = await supabase
    .from('client_plans')
    .insert({
      client_id: clientId,
      coach_id: coachUser.id,
      plan_id: sourceTemplatePlanId,
      name,
      weeks,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    })
    .select('id')
    .single()

  if (clientPlanError || !clientPlan) {
    return { success: false, error: 'Error al crear el plan del cliente' }
  }

  // Copy weeks 1..N from template (weeks > template.weeks → extra weeks are empty)
  const weeksToCopy = planWeeks
    .filter((w) => w.week_number <= weeks)
    .sort((a, b) => a.week_number - b.week_number)

  for (const week of weeksToCopy) {
    const sortedDays = [...(week.plan_days ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )

    for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
      const day = sortedDays[dayIdx]!
      const scheduledDate = computeDayDate(startDate, week.week_number, day.day_of_week)

      const { data: clientDay, error: dayError } = await supabase
        .from('client_plan_days')
        .insert({
          client_plan_id: clientPlan.id,
          week_number: week.week_number,
          day_of_week: day.day_of_week,
          order: dayIdx + 1,
          scheduled_date: scheduledDate,
        })
        .select('id')
        .single()

      if (dayError || !clientDay) {
        await supabase.from('client_plans').delete().eq('id', clientPlan.id)
        return { success: false, error: 'Error al copiar los días del plan' }
      }

      const sortedExercises = [...(day.plan_day_exercises ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      )

      for (let exIdx = 0; exIdx < sortedExercises.length; exIdx++) {
        const exercise = sortedExercises[exIdx]!
        const { error: exError } = await supabase.from('client_plan_day_exercises').insert({
          client_plan_day_id: clientDay.id,
          exercise_id: exercise.exercise_id,
          order: exIdx + 1,
          sets: exercise.sets,
          reps_min: exercise.reps_min ?? null,
          reps_max: exercise.reps_max ?? null,
          duration_seconds: exercise.duration_seconds ?? null,
          rest_seconds: exercise.rest_seconds ?? null,
        })

        if (exError) {
          await supabase.from('client_plans').delete().eq('id', clientPlan.id)
          return { success: false, error: 'Error al copiar ejercicios del plan' }
        }
      }
    }
  }

  return { success: true, clientPlanId: clientPlan.id }
}
