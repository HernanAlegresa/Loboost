import { calculateEndDate } from '@/features/plans/calculate-end-date'

describe('calculateEndDate', () => {
  it('adds correct days for 4 weeks starting 2026-04-09', () => {
    const start = new Date('2026-04-09')
    const end = calculateEndDate(start, 4)
    expect(end.toISOString().split('T')[0]).toBe('2026-05-06')
  })

  it('adds correct days for 1 week', () => {
    const start = new Date('2026-04-09')
    const end = calculateEndDate(start, 1)
    expect(end.toISOString().split('T')[0]).toBe('2026-04-15')
  })

  it('adds correct days for 12 weeks', () => {
    const start = new Date('2026-01-01')
    const end = calculateEndDate(start, 12)
    expect(end.toISOString().split('T')[0]).toBe('2026-03-25')
  })
})
