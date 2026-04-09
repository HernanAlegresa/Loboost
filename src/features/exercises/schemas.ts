import { z } from 'zod'

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  muscleGroup: z.string().min(1, 'El grupo muscular es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  type: z.enum(['strength', 'cardio']),
  videoUrl: z.string().url('URL de video inválida').optional(),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>
