import type { AlertType } from '@/types/domain'

export type AlertInput = {
  lastSessionDate: Date | null
  weeklyCompliance: number
  hasActivePlan: boolean
}

const INACTIVITY_THRESHOLD_DAYS = 5
const LOW_COMPLIANCE_THRESHOLD = 60

export function getClientAlerts({ lastSessionDate, weeklyCompliance, hasActivePlan }: AlertInput): AlertType[] {
  const alerts: AlertType[] = []

  if (!hasActivePlan) {
    alerts.push('no_plan')
    return alerts
  }

  if (lastSessionDate) {
    const daysSinceLastSession = Math.floor(
      (Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastSession > INACTIVITY_THRESHOLD_DAYS) {
      alerts.push('inactive')
    }
  }

  if (weeklyCompliance < LOW_COMPLIANCE_THRESHOLD) {
    alerts.push('low_compliance')
  }

  return alerts
}
