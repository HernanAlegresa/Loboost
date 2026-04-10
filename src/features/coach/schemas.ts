import { z } from 'zod'

export const coachNoteSchema = z.object({
  clientId: z.string().uuid(),
  content: z.string().min(1, 'La nota no puede estar vacía'),
})

export type CoachNoteInput = z.infer<typeof coachNoteSchema>

export const bodyMeasurementSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().date(),
  weightKg: z.coerce.number().min(20).max(300).optional(),
  notes: z.string().optional(),
})

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>

export const coachProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es requerido').max(120, 'Máximo 120 caracteres'),
})

export type CoachProfileUpdateInput = z.infer<typeof coachProfileUpdateSchema>
