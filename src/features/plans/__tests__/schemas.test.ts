import { describe, it, expect } from 'vitest'
import {
  planDayExerciseSchema,
  planBuilderPayloadSchema,
  updateClientPlanExerciseSchema,
} from '../schemas'

const EXERCISE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('planDayExerciseSchema', () => {
  it('accepts fixed reps (repsMin = repsMax)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 8,
      repsMax: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts rep range (repsMin < repsMax)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with durationSeconds and no reps', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 1,
      durationSeconds: 60,
    })
    expect(result.success).toBe(true)
  })

  it('accepts exercise with neither reps nor duration (AMRAP / coach decides)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects repsMax < repsMin at schema level when both provided', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 10,
      repsMax: 8,
    })
    expect(result.success).toBe(false)
  })
})

describe('planBuilderPayloadSchema — multi-week structure', () => {
  const validWeek = (weekNumber: number) => ({
    weekNumber,
    weekName: `Semana ${weekNumber}`,
    weekType: 'normal',
    days: [
      {
        dayOfWeek: 1,
        exercises: [
          { exerciseId: EXERCISE_ID, order: 1, sets: 3, repsMin: 8, repsMax: 10 },
        ],
      },
    ],
  })

  it('accepts a plan with 2 independent weeks', () => {
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan Fuerza',
      weeks: 2,
      planWeeks: [validWeek(1), validWeek(2)],
    })
    expect(result.success).toBe(true)
  })

  it('rejects plan with planWeeks count different from weeks', () => {
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan Fuerza',
      weeks: 3,
      planWeeks: [validWeek(1)],
    })
    expect(result.success).toBe(false)
  })

  it('accepts deload week type', () => {
    const week = { ...validWeek(1), weekType: 'deload' }
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan',
      weeks: 1,
      planWeeks: [week],
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown weekType', () => {
    const week = { ...validWeek(1), weekType: 'rest' }
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan',
      weeks: 1,
      planWeeks: [week],
    })
    expect(result.success).toBe(false)
  })
})

describe('updateClientPlanExerciseSchema', () => {
  it('accepts repsMin update', () => {
    const result = updateClientPlanExerciseSchema.safeParse({ repsMin: 6 })
    expect(result.success).toBe(true)
  })

  it('accepts repsMax update', () => {
    const result = updateClientPlanExerciseSchema.safeParse({ repsMin: 6, repsMax: 8 })
    expect(result.success).toBe(true)
  })
})
