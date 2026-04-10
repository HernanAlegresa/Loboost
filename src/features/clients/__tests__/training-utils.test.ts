import { getCurrentWeek, computeDayDate, computeDayStatus } from '../utils/training-utils'

describe('getCurrentWeek', () => {
  it('returns 1 when today is before start date', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    expect(getCurrentWeek(future, 8)).toBe(1)
  })

  it('returns 1 on the start date itself', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(getCurrentWeek(today, 8)).toBe(1)
  })

  it('returns 2 after 7 days', () => {
    const start = new Date(Date.now() - 7 * 86400000)
    start.setUTCHours(0, 0, 0, 0)
    expect(getCurrentWeek(start.toISOString().split('T')[0], 8)).toBe(2)
  })

  it('caps at totalWeeks when plan has ended', () => {
    expect(getCurrentWeek('2020-01-01', 4)).toBe(4)
  })

  it('returns 1 on day 6 of the plan (still week 1)', () => {
    const start = new Date(Date.now() - 6 * 86400000)
    start.setHours(0, 0, 0, 0)
    expect(getCurrentWeek(start.toISOString().split('T')[0], 8)).toBe(1)
  })
})

describe('computeDayDate', () => {
  it('returns start date for week 1 day 1', () => {
    expect(computeDayDate('2026-04-13', 1, 1)).toBe('2026-04-13')
  })

  it('returns correct date for week 1 day 3 (Wednesday)', () => {
    expect(computeDayDate('2026-04-13', 1, 3)).toBe('2026-04-15')
  })

  it('returns correct date for week 2 day 1 (Monday)', () => {
    expect(computeDayDate('2026-04-13', 2, 1)).toBe('2026-04-20')
  })

  it('returns correct date for week 3 day 7 (Sunday)', () => {
    expect(computeDayDate('2026-04-13', 3, 7)).toBe('2026-05-03')
  })
})

describe('computeDayStatus', () => {
  it('returns completed when session is completed', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'completed')).toBe('completed')
  })

  it('returns in_progress when session is in_progress', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', 'in_progress')).toBe('in_progress')
  })

  it('returns today when date is today and no session', () => {
    expect(computeDayStatus('2026-04-10', '2026-04-10', null)).toBe('today')
  })

  it('returns upcoming for future date with no session', () => {
    expect(computeDayStatus('2026-04-20', '2026-04-10', null)).toBe('upcoming')
  })

  it('returns past_missed for past date with no session', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', null)).toBe('past_missed')
  })

  it('completed status takes priority even for past date', () => {
    expect(computeDayStatus('2026-04-05', '2026-04-10', 'completed')).toBe('completed')
  })
})
