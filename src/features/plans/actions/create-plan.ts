'use server'

import { createClient } from '@/lib/supabase/server'
import { planBuilderPayloadSchema, planDayExerciseSchema, planDaySchema } from '@/features/plans/schemas'

export type CreatePlanState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function createPlanAction(
  _prevState: CreatePlanState,
  formData: FormData
): Promise<CreatePlanState> {
  const payloadRaw = formData.get('planPayload')
  if (typeof payloadRaw !== 'string') {
    return { success: false, error: 'Payload inválido' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(payloadRaw)
  } catch {
    return { success: false, error: 'Payload inválido (JSON)' }
  }

  const payloadResult = planBuilderPayloadSchema.safeParse(parsedJson)
  if (!payloadResult.success) {
    return { success: false, error: payloadResult.error.issues[0].message }
  }
  const payload = payloadResult.data

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const dayNumbers = payload.days.map((d) => d.dayOfWeek)
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    return { success: false, error: 'No podés repetir el mismo día de la semana' }
  }

  const sortedDays = [...payload.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  const allExerciseIds = sortedDays.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const uniqueExerciseIds = [...new Set(allExerciseIds)]

  const { data: exerciseRows, error: exFetchError } = await supabase
    .from('exercises')
    .select('id, type')
    .eq('coach_id', user.id)
    .in('id', uniqueExerciseIds)

  if (exFetchError || !exerciseRows || exerciseRows.length !== uniqueExerciseIds.length) {
    return { success: false, error: 'Ejercicio inválido o no pertenece a tu biblioteca' }
  }

  const typeById = new Map(exerciseRows.map((r) => [r.id, r.type as 'strength' | 'cardio']))

  for (const day of sortedDays) {
    const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order)
    for (const exercise of sortedExercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) {
        return { success: false, error: 'Datos de ejercicio inválidos' }
      }
      const t = typeById.get(exResult.data.exerciseId)
      if (t === 'strength') {
        if (exResult.data.reps == null) {
          return { success: false, error: 'En fuerza, las repeticiones son requeridas' }
        }
        if (exResult.data.durationSeconds != null) {
          return { success: false, error: 'En fuerza, no uses duración (usá repeticiones)' }
        }
      }
      if (t === 'cardio') {
        if (exResult.data.durationSeconds == null) {
          return { success: false, error: 'En cardio, la duración (segundos) es requerida' }
        }
        if (exResult.data.reps != null) {
          return { success: false, error: 'En cardio, no uses repeticiones (usá duración)' }
        }
      }
    }
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      coach_id: user.id,
      name: payload.name,
      description: payload.description ?? null,
      weeks: payload.weeks,
    })
    .select('id')
    .single()

  if (planError || !plan) return { success: false, error: 'Error al crear el plan' }

  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i]
    const dayResult = planDaySchema.safeParse({
      dayOfWeek: day.dayOfWeek,
      order: i + 1,
    })
    if (!dayResult.success) {
      await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
      return { success: false, error: 'Datos de día inválidos' }
    }

    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_of_week: dayResult.data.dayOfWeek,
        order: dayResult.data.order,
      })
      .select('id')
      .single()

    if (dayError || !planDay) {
      await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
      return { success: false, error: 'Error al crear el día del plan' }
    }

    const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order)

    for (const exercise of sortedExercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) {
        await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
        return { success: false, error: 'Datos de ejercicio inválidos' }
      }

      const { error: exError } = await supabase.from('plan_day_exercises').insert({
        plan_day_id: planDay.id,
        exercise_id: exResult.data.exerciseId,
        order: exResult.data.order,
        sets: exResult.data.sets,
        reps: exResult.data.reps ?? null,
        duration_seconds: exResult.data.durationSeconds ?? null,
        rest_seconds: exResult.data.restSeconds ?? null,
      })

      if (exError) {
        await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
        return { success: false, error: 'Error al agregar ejercicio al plan' }
      }
    }
  }

  return { success: true, planId: plan.id }
}
