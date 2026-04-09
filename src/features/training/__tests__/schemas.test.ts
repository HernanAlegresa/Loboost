import { completeSetSchema } from '@/features/training/schemas'

describe('completeSetSchema', () => {
  it('accepts strength set with weight', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 1,
      weightKg: 80,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio set with duration', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 1,
      durationSeconds: 1800,
    })
    expect(result.success).toBe(true)
  })

  it('rejects set_number less than 1', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 0,
      weightKg: 80,
    })
    expect(result.success).toBe(false)
  })
})
