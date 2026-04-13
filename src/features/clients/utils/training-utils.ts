import type { DayStatus } from '../types'

export function getTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns the 1-indexed week number for today given a plan's start date.
 * Returns 1 if today < startDate. Capped at totalWeeks.
 */
export function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const todayISO = getTodayISO()
  const [todayYear, todayMonth, todayDay] = todayISO.split('-').map(Number)
  const start = new Date(startYear, startMonth - 1, startDay)
  const today = new Date(todayYear, todayMonth - 1, todayDay)
  if (today <= start) return 1
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks)
}

/**
 * Computes the ISO date string (YYYY-MM-DD) for a plan day.
 * week 1 day 1 = startDate, week 1 day 2 = startDate + 1, etc.
 * dayOfWeek: 1=Monday … 7=Sunday
 */
export function computeDayDate(startDate: string, weekNumber: number, dayOfWeek: number): string {
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  const offsetDays = (weekNumber - 1) * 7 + (dayOfWeek - 1)
  const d = new Date(start.getTime() + offsetDays * 86400000)
  return d.toISOString().split('T')[0]
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
