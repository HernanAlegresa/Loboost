import type { SupabaseClient } from '@supabase/supabase-js'
import {
  planBuilderPayloadSchema,
  planDayExerciseSchema,
  planDaySchema,
  type PlanBuilderPayloadInput,
} from '@/features/plans/schemas'
import type { Database } from '@/types/database'

export type ValidatedPlanBuilder = {
  payload: PlanBuilderPayloadInput
  sortedDays: PlanBuilderPayloadInput['days']
}

/** Parse JSON + Zod + exercise types + reps/cardio rules. */
export async function validatePlanBuilderForCoach(
  supabase: SupabaseClient<Database>,
  coachUserId: string,
  parsedJson: unknown
): Promise<{ ok: true; data: ValidatedPlanBuilder } | { ok: false; error: string }> {
  const payloadResult = planBuilderPayloadSchema.safeParse(parsedJson)
  if (!payloadResult.success) {
    return { ok: false, error: payloadResult.error.issues[0].message }
  }
  const payload = payloadResult.data

  const dayNumbers = payload.days.map((d) => d.dayOfWeek)
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    return { ok: false, error: 'No podés repetir el mismo día de la semana' }
  }

  const sortedDays = [...payload.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  const allExerciseIds = sortedDays.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const uniqueExerciseIds = [...new Set(allExerciseIds)]

  const { data: exerciseRows, error: exFetchError } = await supabase
    .from('exercises')
    .select('id, type')
    .eq('coach_id', coachUserId)
    .in('id', uniqueExerciseIds)

  if (exFetchError || !exerciseRows || exerciseRows.length !== uniqueExerciseIds.length) {
    return { ok: false, error: 'Ejercicio inválido o no pertenece a tu biblioteca' }
  }

  const typeById = new Map(exerciseRows.map((r) => [r.id, r.type as 'strength' | 'cardio']))

  for (const day of sortedDays) {
    const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order)
    for (const exercise of sortedExercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) {
        return { ok: false, error: 'Datos de ejercicio inválidos' }
      }
      const t = typeById.get(exResult.data.exerciseId)
      if (t === 'strength') {
        if (exResult.data.reps == null) {
          return { ok: false, error: 'En fuerza, las repeticiones son requeridas' }
        }
        if (exResult.data.durationSeconds != null) {
          return { ok: false, error: 'En fuerza, no uses duración (usá repeticiones)' }
        }
      }
      if (t === 'cardio') {
        if (exResult.data.durationSeconds == null) {
          return { ok: false, error: 'En cardio, la duración (segundos) es requerida' }
        }
        if (exResult.data.reps != null) {
          return { ok: false, error: 'En cardio, no uses repeticiones (usá duración)' }
        }
      }
    }
  }

  return { ok: true, data: { payload, sortedDays } }
}

/** Insert plan_days + plan_day_exercises for an existing plan row. */
export async function insertPlanDayTree(
  supabase: SupabaseClient<Database>,
  planId: string,
  coachUserId: string,
  sortedDays: PlanBuilderPayloadInput['days']
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i]
    const dayResult = planDaySchema.safeParse({
      dayOfWeek: day.dayOfWeek,
      order: i + 1,
    })
    if (!dayResult.success) {
      return { ok: false, error: 'Datos de día inválidos' }
    }

    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: planId,
        day_of_week: dayResult.data.dayOfWeek,
        order: dayResult.data.order,
      })
      .select('id')
      .single()

    if (dayError || !planDay) {
      return { ok: false, error: 'Error al crear el día del plan' }
    }

    const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order)

    for (const exercise of sortedExercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) {
        return { ok: false, error: 'Datos de ejercicio inválidos' }
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
        return { ok: false, error: 'Error al agregar ejercicio al plan' }
      }
    }
  }

  return { ok: true }
}

export async function deletePlanDayTree(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: dayRows, error: fetchErr } = await supabase
    .from('plan_days')
    .select('id')
    .eq('plan_id', planId)

  if (fetchErr) return { ok: false, error: 'Error al preparar la edición del plan' }

  const dayIds = (dayRows ?? []).map((d) => d.id)
  if (dayIds.length > 0) {
    const { error: delEx } = await supabase.from('plan_day_exercises').delete().in('plan_day_id', dayIds)
    if (delEx) return { ok: false, error: 'Error al actualizar ejercicios del plan' }
  }

  const { error: delDays } = await supabase.from('plan_days').delete().eq('plan_id', planId)
  if (delDays) return { ok: false, error: 'Error al actualizar días del plan' }

  return { ok: true }
}
