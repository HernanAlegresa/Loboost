import { z } from 'zod'
import { MUSCLE_GROUPS } from './muscle-groups'

export const exerciseSchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  muscleGroup: z.enum(MUSCLE_GROUPS, { message: 'Grupo muscular inválido' }),
  type:        z.enum(['strength', 'cardio']),
  videoUrl:    z.string().url('URL de video inválida').optional(),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>
