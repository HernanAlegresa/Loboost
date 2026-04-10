'use server'

import { createClient } from '@/lib/supabase/server'
import { assignPlanSchema } from '@/features/plans/schemas'

export function calculateEndDate(startDate: Date, weeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + weeks * 7 - 1)
  return end
}

export type AssignPlanState =
  | { success: true; clientPlanId: string }
  | { success: false; error: string }
  | null

export async function assignPlanAction(
  _prevState: AssignPlanState,
  formData: FormData
): Promise<AssignPlanState> {
  const raw = {
    clientId: formData.get('clientId'),
    planId: formData.get('planId'),
    startDate: formData.get('startDate'),
  }

  const result = assignPlanSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: clientProfile, error: clientError } = await supabase
    .from('profiles')
    .select('id, coach_id, role')
    .eq('id', result.data.clientId)
    .single()

  if (clientError || !clientProfile) return { success: false, error: 'Cliente no encontrado' }
  if (clientProfile.role !== 'client' || clientProfile.coach_id !== coachUser.id) {
    return { success: false, error: 'Cliente no válido' }
  }

  // Obtener el plan template con días y ejercicios
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select(`
      id, name, weeks,
      plan_days (
        id, day_of_week, order,
        plan_day_exercises (
          id, exercise_id, order, sets, reps, duration_seconds, rest_seconds
        )
      )
    `)
    .eq('id', result.data.planId)
    .eq('coach_id', coachUser.id)
    .single()

  if (planError || !plan) return { success: false, error: 'Plan no encontrado' }

  const planDays = (plan.plan_days ?? []) as Array<{
    id: string
    day_of_week: number
    order: number
    plan_day_exercises: Array<{
      id: string
      exercise_id: string
      order: number
      sets: number
      reps: number | null
      duration_seconds: number | null
      rest_seconds: number | null
    }>
  }>

  if (planDays.length === 0) {
    return { success: false, error: 'Este plan no tiene días configurados' }
  }

  const startDate = new Date(result.data.startDate)
  const endDate = calculateEndDate(startDate, plan.weeks)

  // Marcar plan activo anterior como completado
  await supabase
    .from('client_plans')
    .update({ status: 'completed' })
    .eq('client_id', result.data.clientId)
    .eq('coach_id', coachUser.id)
    .eq('status', 'active')

  // Crear client_plan
  const { data: clientPlan, error: clientPlanError } = await supabase
    .from('client_plans')
    .insert({
      client_id: result.data.clientId,
      coach_id: coachUser.id,
      plan_id: plan.id,
      name: plan.name,
      weeks: plan.weeks,
      start_date: result.data.startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    })
    .select('id')
    .single()

  if (clientPlanError || !clientPlan) return { success: false, error: 'Error al asignar el plan' }

  const sortedDays = [...planDays].sort((a, b) => a.order - b.order)

  for (let week = 1; week <= plan.weeks; week++) {
    for (const day of sortedDays) {
      const { data: clientDay, error: dayError } = await supabase
        .from('client_plan_days')
        .insert({
          client_plan_id: clientPlan.id,
          week_number: week,
          day_of_week: day.day_of_week,
          order: day.order,
        })
        .select('id')
        .single()

      if (dayError || !clientDay) return { success: false, error: 'Error al copiar los días del plan' }

      const sortedExercises = [...(day.plan_day_exercises ?? [])].sort(
        (a, b) => a.order - b.order
      )

      for (const exercise of sortedExercises) {
        const { error: exError } = await supabase
          .from('client_plan_day_exercises')
          .insert({
            client_plan_day_id: clientDay.id,
            exercise_id: exercise.exercise_id,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps ?? null,
            duration_seconds: exercise.duration_seconds ?? null,
            rest_seconds: exercise.rest_seconds ?? null,
          })

        if (exError) return { success: false, error: 'Error al copiar ejercicios del plan' }
      }
    }
  }

  return { success: true, clientPlanId: clientPlan.id }
}
