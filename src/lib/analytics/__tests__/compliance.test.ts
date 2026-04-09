import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'

describe('calculateWeeklyCompliance', () => {
  it('returns 100 when all sessions completed', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 3, completedDays: 3 })).toBe(100)
  })

  it('returns 0 when no sessions completed', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 3, completedDays: 0 })).toBe(0)
  })

  it('returns correct percentage for partial completion', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 4, completedDays: 3 })).toBe(75)
  })

  it('returns 0 when no expected days', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 0, completedDays: 0 })).toBe(0)
  })
})
