import { createPlanSchema, planDayExerciseSchema } from '@/features/plans/schemas'

describe('createPlanSchema', () => {
  it('accepts valid plan', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan fuerza 8 semanas', weeks: 8 })
    expect(result.success).toBe(true)
  })

  it('rejects weeks > 12', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan', weeks: 13 })
    expect(result.success).toBe(false)
  })

  it('rejects weeks < 1', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan', weeks: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createPlanSchema.safeParse({ name: '', weeks: 4 })
    expect(result.success).toBe(false)
  })
})

describe('planDayExerciseSchema', () => {
  it('accepts strength exercise with reps', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: '123e4567-e89b-12d3-a456-426614174000',
      order: 1,
      sets: 4,
      reps: 10,
      restSeconds: 90,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with duration', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: '123e4567-e89b-12d3-a456-426614174000',
      order: 1,
      sets: 1,
      durationSeconds: 1800,
    })
    expect(result.success).toBe(true)
  })
})
