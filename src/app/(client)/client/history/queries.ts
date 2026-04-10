import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { WeekHistorySummary } from '@/features/training/types'

export async function getWeeklyHistorySummaries(
  clientId: string
): Promise<WeekHistorySummary[]> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return []

  const [daysResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week')
      .eq('client_plan_id', plan.id)
      .order('week_number')
      .order('day_of_week'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .eq('status', 'completed'),
  ])

  const completedDayIds = new Set<string>(
    (sessionsResult.data ?? []).map((s) => s.client_plan_day_id)
  )

  const totalByWeek = new Map<number, number>()
  const completedByWeek = new Map<number, number>()
  for (const day of daysResult.data ?? []) {
    totalByWeek.set(day.week_number, (totalByWeek.get(day.week_number) ?? 0) + 1)
    if (completedDayIds.has(day.id)) {
      completedByWeek.set(
        day.week_number,
        (completedByWeek.get(day.week_number) ?? 0) + 1
      )
    }
  }

  const result: WeekHistorySummary[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    const completed = completedByWeek.get(w) ?? 0
    if (completed === 0) continue
    const total = totalByWeek.get(w) ?? 0
    result.push({
      weekNumber: w,
      dateRangeStart: computeDayDate(plan.start_date, w, 1),
      dateRangeEnd: computeDayDate(plan.start_date, w, 7),
      completedDays: completed,
      totalTrainingDays: total,
      compliancePct: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  }

  return result.sort((a, b) => b.weekNumber - a.weekNumber)
}
