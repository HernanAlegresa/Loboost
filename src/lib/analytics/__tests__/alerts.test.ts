import { getClientAlerts } from '@/lib/analytics/alerts'

describe('getClientAlerts', () => {
  it('returns inactive alert when last session was more than 5 days ago', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 6)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 80, hasActivePlan: true })
    expect(alerts).toContain('inactive')
  })

  it('returns low_compliance alert when below 60%', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 1)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 50, hasActivePlan: true })
    expect(alerts).toContain('low_compliance')
  })

  it('returns no alerts for active compliant client', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 1)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 80, hasActivePlan: true })
    expect(alerts).toHaveLength(0)
  })

  it('returns no_plan alert when client has no active plan', () => {
    const alerts = getClientAlerts({ lastSessionDate: null, weeklyCompliance: 0, hasActivePlan: false })
    expect(alerts).toContain('no_plan')
  })
})
