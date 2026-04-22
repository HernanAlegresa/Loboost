import type { DayStatus } from '../types'

export function getTodayISO(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns the 1-indexed week number for today given a plan's start date.
 * Returns 1 if today < startDate. Capped at totalWeeks.
 * All date arithmetic is done in UTC to avoid timezone drift.
 */
export function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const start = Date.UTC(sy!, sm! - 1, sd!)
  const todayISO = getTodayISO()
  const [ty, tm, td] = todayISO.split('-').map(Number)
  const today = Date.UTC(ty!, tm! - 1, td!)
  if (today <= start) return 1
  const daysSinceStart = Math.floor((today - start) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}

/**
 * Computes the ISO date string (YYYY-MM-DD) for a plan day.
 * dayOfWeek: 1=Monday … 7=Sunday
 * Week 1 is the calendar week (Mon–Sun) that contains start_date.
 * Week N starts on the Monday of that nth week.
 */
export function computeDayDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const start = Date.UTC(sy!, sm! - 1, sd!)

  // Find the Monday of the week that contains start_date (0=Sun, 1=Mon, ...)
  const startDow = new Date(start).getUTCDay()
  const daysToMonday = startDow === 0 ? -6 : 1 - startDow
  const week1Monday = start + daysToMonday * 86400000

  // Monday of week N
  const weekNMonday = week1Monday + (weekNumber - 1) * 7 * 86400000

  // Target day: dayOfWeek 1=Mon, 7=Sun
  const targetMs = weekNMonday + (dayOfWeek - 1) * 86400000
  return new Date(targetMs).toISOString().split('T')[0]!
}

/** Returns true if end_date (YYYY-MM-DD) has already passed. */
export function isPlanExpired(endDate: string | null): boolean {
  if (!endDate) return false
  const today = getTodayISO()
  return endDate < today
}

/**
 * Determines display status of a training day.
 * sessionStatus takes priority over date comparison.
 */
export function computeDayStatus(
  dateISO: string,
  todayISO: string,
  sessionStatus: 'in_progress' | 'completed' | null
): DayStatus {
  if (sessionStatus === 'completed') return 'completed'
  if (sessionStatus === 'in_progress') return 'in_progress'
  if (dateISO === todayISO) return 'today'
  if (dateISO > todayISO) return 'upcoming'
  return 'past_missed'
}
