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

export const planDayExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  order: z.coerce.number().int().min(1),
  sets: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
})

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

export const planBuilderPayloadSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(12),
  days: z.array(planBuilderDaySchema).min(1, 'Agregá al menos un día de entrenamiento'),
})

export type PlanBuilderPayloadInput = z.infer<typeof planBuilderPayloadSchema>

export const updateClientPlanExerciseSchema = z.object({
  sets: z.coerce.number().int().min(1).optional(),
  reps: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(1).optional(),
})

export type UpdateClientPlanExerciseInput = z.infer<typeof updateClientPlanExerciseSchema>
