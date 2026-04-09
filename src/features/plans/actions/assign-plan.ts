'use server'

import { createClient } from '@/lib/supabase/server'
import { assignPlanSchema } from '@/features/plans/schemas'

export function calculateEndDate(startDate: Date, weeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + weeks * 7 - 1)
  return end
}

export async function assignPlanAction(formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    planId: formData.get('planId'),
    startDate: formData.get('startDate'),
  }

  const result = assignPlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !coachUser) return { error: 'No autenticado' }

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
    .single()

  if (planError || !plan) return { error: 'Plan no encontrado' }

  const startDate = new Date(result.data.startDate)
  const endDate = calculateEndDate(startDate, plan.weeks)

  // Marcar plan activo anterior como completado
  await supabase
    .from('client_plans')
    .update({ status: 'completed' })
    .eq('client_id', result.data.clientId)
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

  if (clientPlanError || !clientPlan) return { error: 'Error al asignar el plan' }

  // Copiar días y ejercicios para cada semana (1 a N)
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

      if (dayError || !clientDay) return { error: 'Error al copiar los días del plan' }

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

        if (exError) return { error: 'Error al copiar ejercicios del plan' }
      }
    }
  }

  return { success: true, clientPlanId: clientPlan.id }
}
