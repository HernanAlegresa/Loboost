export type ComplianceInput = {
  expectedDays: number
  completedDays: number
}

export function calculateWeeklyCompliance({ expectedDays, completedDays }: ComplianceInput): number {
  if (expectedDays === 0) return 0
  return Math.round((completedDays / expectedDays) * 100)
}
