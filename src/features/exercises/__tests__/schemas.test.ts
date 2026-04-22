import { describe, it, expect } from 'vitest'
import { exerciseSchema } from '../schemas'

describe('exerciseSchema', () => {
  const valid = {
    name: 'Press de banca',
    muscleGroup: 'pecho',
    type: 'strength',
  }

  it('accepts a valid exercise without videoUrl', () => {
    expect(exerciseSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a valid exercise with videoUrl', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: 'https://youtube.com/watch?v=abc' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = exerciseSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a free-text muscle group', () => {
    const result = exerciseSchema.safeParse({ ...valid, muscleGroup: 'Chest' })
    expect(result.success).toBe(false)
  })

  it('accepts all canonical muscle groups', () => {
    const groups = ['pecho','espalda','hombros','biceps','triceps','cuadriceps','isquiotibiales','gluteos','abdomen','pantorrillas']
    for (const g of groups) {
      expect(exerciseSchema.safeParse({ ...valid, muscleGroup: g }).success).toBe(true)
    }
  })

  it('rejects an invalid video URL', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('accepts undefined videoUrl', () => {
    const result = exerciseSchema.safeParse({ ...valid, videoUrl: undefined })
    expect(result.success).toBe(true)
  })
})
