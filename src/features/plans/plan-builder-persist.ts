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
}

/** Parse JSON + Zod + exercise type rules (strength requires repsMin, cardio requires durationSeconds). */
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

  // Validate week_number sequence: must be 1..N in order
  const weekNumbers = payload.planWeeks.map((w) => w.weekNumber)
  for (let i = 0; i < weekNumbers.length; i++) {
    if (weekNumbers[i] !== i + 1) {
      return { ok: false, error: `Las semanas deben estar numeradas del 1 al ${payload.weeks}` }
    }
  }

  // Collect all exercise IDs across all weeks for a single DB lookup
  const allExerciseIds = payload.planWeeks
    .flatMap((w) => w.days)
    .flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const uniqueExerciseIds = [...new Set(allExerciseIds)]

  if (uniqueExerciseIds.length === 0) {
    return { ok: false, error: 'El plan debe tener al menos un ejercicio' }
  }

  const { data: exerciseRows, error: exFetchError } = await supabase
    .from('exercises')
    .select('id, type')
    .eq('coach_id', coachUserId)
    .in('id', uniqueExerciseIds)

  if (exFetchError || !exerciseRows || exerciseRows.length !== uniqueExerciseIds.length) {
    return { ok: false, error: 'Ejercicio inválido o no pertenece a tu biblioteca' }
  }

  const typeById = new Map(exerciseRows.map((r) => [r.id, r.type as 'strength' | 'cardio']))

  for (const week of payload.planWeeks) {
    const dayNumbers = week.days.map((d) => d.dayOfWeek)
    if (new Set(dayNumbers).size !== dayNumbers.length) {
      return {
        ok: false,
        error: `Semana ${week.weekNumber}: no podés repetir el mismo día de la semana`,
      }
    }

    for (const day of week.days) {
      for (const exercise of day.exercises) {
        const exResult = planDayExerciseSchema.safeParse(exercise)
        if (!exResult.success) {
          return { ok: false, error: 'Datos de ejercicio inválidos' }
        }
        const t = typeById.get(exResult.data.exerciseId)
        if (t === 'strength') {
          if (exResult.data.repsMin == null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en fuerza, las repeticiones mínimas son requeridas`,
            }
          }
          if (exResult.data.durationSeconds != null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en fuerza, no uses duración (usá repeticiones)`,
            }
          }
        }
        if (t === 'cardio') {
          if (exResult.data.durationSeconds == null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en cardio, la duración (segundos) es requerida`,
            }
          }
          if (exResult.data.repsMin != null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en cardio, no uses repeticiones (usá duración)`,
            }
          }
        }
      }
    }
  }

  return { ok: true, data: { payload } }
}

/** Insert plan_weeks → plan_days → plan_day_exercises for an existing plan row. */
export async function insertPlanWeekTree(
  supabase: SupabaseClient<Database>,
  planId: string,
  planWeeks: PlanBuilderPayloadInput['planWeeks']
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const week of planWeeks) {
    const { data: planWeek, error: weekError } = await supabase
      .from('plan_weeks')
      .insert({
        plan_id: planId,
        week_number: week.weekNumber,
        week_name: week.weekName ?? `Semana ${week.weekNumber}`,
        week_type: week.weekType,
      })
      .select('id')
      .single()

    if (weekError || !planWeek) {
      return { ok: false, error: 'Error al crear la semana del plan' }
    }

    const sortedDays = [...week.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const dayResult = planDaySchema.safeParse({ dayOfWeek: day.dayOfWeek, order: i + 1 })
      if (!dayResult.success) {
        return { ok: false, error: 'Datos de día inválidos' }
      }

      const { data: planDay, error: dayError } = await supabase
        .from('plan_days')
        .insert({
          plan_id: planId,
          plan_week_id: planWeek.id,
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
          reps_min: exResult.data.repsMin ?? null,
          reps_max: exResult.data.repsMax ?? null,
          duration_seconds: exResult.data.durationSeconds ?? null,
          rest_seconds: exResult.data.restSeconds ?? null,
        })

        if (exError) {
          return { ok: false, error: 'Error al agregar ejercicio al plan' }
        }
      }
    }
  }

  return { ok: true }
}

/**
 * Delete all plan_weeks for a plan.
 * Cascades to plan_days and plan_day_exercises via FK ON DELETE CASCADE.
 */
export async function deletePlanWeekTree(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('plan_weeks').delete().eq('plan_id', planId)
  if (error) return { ok: false, error: 'Error al actualizar semanas del plan' }
  return { ok: true }
}
