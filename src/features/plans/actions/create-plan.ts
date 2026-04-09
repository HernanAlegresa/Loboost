'use server'

import { createClient } from '@/lib/supabase/server'
import { createPlanSchema, planDaySchema, planDayExerciseSchema } from '@/features/plans/schemas'
import type { PlanDayInput, PlanDayExerciseInput } from '@/features/plans/schemas'

export async function createPlanAction(
  formData: FormData,
  days: Array<{ day: PlanDayInput; exercises: PlanDayExerciseInput[] }>
) {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    weeks: formData.get('weeks'),
  }

  const result = createPlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      coach_id: user.id,
      name: result.data.name,
      description: result.data.description ?? null,
      weeks: result.data.weeks,
    })
    .select('id')
    .single()

  if (planError || !plan) return { error: 'Error al crear el plan' }

  for (const { day, exercises } of days) {
    const dayResult = planDaySchema.safeParse(day)
    if (!dayResult.success) return { error: 'Datos de día inválidos' }

    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_of_week: dayResult.data.dayOfWeek,
        order: dayResult.data.order,
      })
      .select('id')
      .single()

    if (dayError || !planDay) return { error: 'Error al crear el día del plan' }

    for (const exercise of exercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) return { error: 'Datos de ejercicio inválidos' }

      const { error: exError } = await supabase
        .from('plan_day_exercises')
        .insert({
          plan_day_id: planDay.id,
          exercise_id: exResult.data.exerciseId,
          order: exResult.data.order,
          sets: exResult.data.sets,
          reps: exResult.data.reps ?? null,
          duration_seconds: exResult.data.durationSeconds ?? null,
          rest_seconds: exResult.data.restSeconds ?? null,
        })

      if (exError) return { error: 'Error al agregar ejercicio al plan' }
    }
  }

  return { success: true, planId: plan.id }
}
