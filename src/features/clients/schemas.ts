import { z } from 'zod'

const GOALS = [
  'Pérdida de peso',
  'Ganancia muscular',
  'Tonificación',
  'Rendimiento atlético',
  'Otro',
] as const

export const GOAL_OPTIONS = GOALS

export const createClientSchema = z.object({
  fullName:        z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:           z.string().email('Email inválido'),
  password:        z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  age:             z.coerce.number().int().min(10).max(100),
  sex:             z.enum(['male', 'female', 'other']),
  goal:            z.enum(GOALS, { message: 'Seleccioná un objetivo válido' }),
  weightKg:        z.coerce.number().min(20).max(300),
  heightCm:        z.coerce.number().min(100).max(250),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  daysPerWeek:     z.coerce.number().int().min(1).max(6),
  injuries:        z.string().min(1, 'Escribí "Ninguna" si no tenés lesiones').max(500),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientProfileSchema = z.object({
  age:             z.coerce.number().int().min(10).max(100).optional(),
  sex:             z.enum(['male', 'female', 'other']).optional(),
  goal:            z.enum(GOALS).optional(),
  weightKg:        z.coerce.number().min(20).max(300).optional(),
  heightCm:        z.coerce.number().min(100).max(250).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  daysPerWeek:     z.coerce.number().int().min(1).max(6).optional(),
  injuries:        z.string().min(1, 'Escribí "Ninguna" si no tenés lesiones').optional(),
})

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
