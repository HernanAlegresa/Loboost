import { z } from 'zod'

export const startSessionSchema = z.object({
  clientPlanDayId: z.string().uuid(),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>

export const completeSetSchema = z.object({
  sessionId: z.string().uuid(),
  clientPlanDayExerciseId: z.string().uuid(),
  setNumber: z.coerce.number().int().min(1),
  repsPerformed: z.coerce.number().int().min(1).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
})

export type CompleteSetInput = z.infer<typeof completeSetSchema>

export const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
})

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
