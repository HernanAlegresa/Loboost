import { createClientSchema } from '../schemas'

const valid = {
  fullName: 'Sofía Torres',
  email: 'sofia@example.com',
  password: 'password123',
  age: '25',
  sex: 'female',
  goal: 'Pérdida de peso',
  weightKg: '65',
  heightCm: '165',
  experienceLevel: 'intermediate',
  daysPerWeek: '4',
  injuries: 'Ninguna',
}

describe('createClientSchema', () => {
  it('accepts fully valid data', () => {
    expect(createClientSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid goal value', () => {
    expect(createClientSchema.safeParse({ ...valid, goal: 'Algo random' }).success).toBe(false)
  })

  it('accepts all valid goal values', () => {
    const goals = [
      'Pérdida de peso', 'Ganancia muscular', 'Definición muscular',
      'Mejorar condición física', 'Rendimiento deportivo', 'Rehabilitación',
      'Salud general', 'Otro',
    ]
    for (const goal of goals) {
      expect(createClientSchema.safeParse({ ...valid, goal }).success).toBe(true)
    }
  })

  it('accepts missing injuries (optional field)', () => {
    const { injuries, ...withoutInjuries } = valid
    expect(createClientSchema.safeParse(withoutInjuries).success).toBe(true)
  })

  it('rejects daysPerWeek > 6', () => {
    expect(createClientSchema.safeParse({ ...valid, daysPerWeek: '7' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(createClientSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(createClientSchema.safeParse({ ...valid, email: 'notanemail' }).success).toBe(false)
  })

  it('coerces age from string to number', () => {
    const result = createClientSchema.safeParse(valid)
    expect(result.success && result.data.age).toBe(25)
  })
})
