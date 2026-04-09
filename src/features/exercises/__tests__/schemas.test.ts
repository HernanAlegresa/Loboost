import { exerciseSchema } from '@/features/exercises/schemas'

describe('exerciseSchema', () => {
  it('accepts valid strength exercise', () => {
    const result = exerciseSchema.safeParse({
      name: 'Press de banca',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'strength',
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with video url', () => {
    const result = exerciseSchema.safeParse({
      name: 'Cinta',
      muscleGroup: 'Cardio',
      category: 'Aeróbico',
      type: 'cardio',
      videoUrl: 'https://youtube.com/watch?v=abc123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = exerciseSchema.safeParse({
      name: 'Press',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = exerciseSchema.safeParse({
      name: '',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'strength',
    })
    expect(result.success).toBe(false)
  })
})
