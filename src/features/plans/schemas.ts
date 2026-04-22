import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(12),
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(12).optional(),
})

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>

export const planDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  order: z.coerce.number().int().min(1),
})

export type PlanDayInput = z.infer<typeof planDaySchema>

export const planDayExerciseSchema = z
  .object({
    exerciseId: z.string().uuid(),
    order: z.coerce.number().int().min(1),
    sets: z.coerce.number().int().min(1),
    repsMin: z.coerce.number().int().min(1).optional(),
    repsMax: z.coerce.number().int().min(1).optional(),
    durationSeconds: z.coerce.number().int().min(1).optional(),
    restSeconds: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (d) => d.repsMax == null || d.repsMin == null || d.repsMax >= d.repsMin,
    { message: 'El rango máximo de reps debe ser mayor o igual al mínimo' }
  )

export type PlanDayExerciseInput = z.infer<typeof planDayExerciseSchema>

export const assignPlanSchema = z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().date(),
})

export type AssignPlanInput = z.infer<typeof assignPlanSchema>

export const planBuilderDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  exercises: z.array(planDayExerciseSchema).min(1, 'Cada día debe tener al menos un ejercicio'),
})

export type PlanBuilderDayInput = z.infer<typeof planBuilderDaySchema>

export const planBuilderWeekSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(12),
  weekName: z.string().optional(),
  weekType: z.enum(['normal', 'deload', 'peak', 'test']).default('normal'),
  days: z.array(planBuilderDaySchema).min(0),
})

export type PlanBuilderWeekInput = z.infer<typeof planBuilderWeekSchema>

export const planBuilderPayloadSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    description: z.string().optional(),
    weeks: z.coerce.number().int().min(1).max(12),
    planWeeks: z
      .array(planBuilderWeekSchema)
      .min(1, 'Debe haber al menos una semana configurada'),
  })
  .refine((d) => d.planWeeks.length === d.weeks, {
    message: 'La cantidad de semanas configuradas debe coincidir con el total de semanas del plan',
    path: ['planWeeks'],
  })

export type PlanBuilderPayloadInput = z.infer<typeof planBuilderPayloadSchema>

export const updateClientPlanExerciseSchema = z.object({
  sets: z.coerce.number().int().min(1).optional(),
  repsMin: z.coerce.number().int().min(1).optional(),
  repsMax: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(1).optional(),
})

export type UpdateClientPlanExerciseInput = z.infer<typeof updateClientPlanExerciseSchema>

/** Returns a human-readable rep range string: "8", "8–12", or "—" */
export function formatReps(repsMin?: number | null, repsMax?: number | null): string {
  if (repsMin == null) return '—'
  if (repsMax == null || repsMax === repsMin) return String(repsMin)
  return `${repsMin}–${repsMax}`
}
