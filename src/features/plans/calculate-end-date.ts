/** End date inclusive: start + (weeks * 7 - 1) days. */
export function calculateEndDate(startDate: Date, weeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + weeks * 7 - 1)
  return end
}
