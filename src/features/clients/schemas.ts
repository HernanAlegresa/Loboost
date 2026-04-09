import { z } from 'zod'

export const createClientSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  age: z.coerce.number().int().min(10).max(100),
  sex: z.enum(['male', 'female', 'other']),
  goal: z.string().min(3, 'El objetivo debe tener al menos 3 caracteres'),
  weightKg: z.coerce.number().min(20).max(300),
  heightCm: z.coerce.number().min(100).max(250),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  injuries: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientProfileSchema = z.object({
  age: z.coerce.number().int().min(10).max(100).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  goal: z.string().min(3).optional(),
  weightKg: z.coerce.number().min(20).max(300).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  injuries: z.string().optional(),
})

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
