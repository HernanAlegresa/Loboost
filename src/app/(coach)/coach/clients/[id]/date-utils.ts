// Pure date helpers shared across coach client profile subpages

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export function getWeekDateRange(planStartDate: string, weekNumber: number) {
  const start = addDays(planStartDate, (weekNumber - 1) * 7)
  const end = addDays(start, 6)
  return { start, end }
}

export function formatDateShort(dateStr: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

export function formatDateRange(start: string, end: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  return `${s.getUTCDate()} ${months[s.getUTCMonth()]} – ${e.getUTCDate()} ${months[e.getUTCMonth()]}`
}
