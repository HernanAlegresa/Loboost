import { completeSetSchema, completeSessionSchema } from '../schemas'

const SESSION_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const EXERCISE_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

describe('completeSetSchema', () => {
  it('accepts strength set with weight and reps', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      weightKg: 80,
      repsPerformed: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio set with durationSeconds only', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      durationSeconds: 60,
    })
    expect(result.success).toBe(true)
  })

  it('accepts set with only setNumber (minimal completion)', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects repsPerformed = 0', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      repsPerformed: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('completeSessionSchema', () => {
  it('accepts session completion with RPE', () => {
    const result = completeSessionSchema.safeParse({
      sessionId: SESSION_ID,
      rpe: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts session without RPE', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID })
    expect(result.success).toBe(true)
  })

  it('rejects RPE = 0', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID, rpe: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects RPE = 11', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID, rpe: 11 })
    expect(result.success).toBe(false)
  })

  it('accepts notes', () => {
    const result = completeSessionSchema.safeParse({
      sessionId: SESSION_ID,
      rpe: 7,
      notes: 'Sentí las piernas pesadas',
    })
    expect(result.success).toBe(true)
  })
})
