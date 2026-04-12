import { createClient } from '@/lib/supabase/server'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
  getTodayISO,
} from '@/features/clients/utils/training-utils'
import type {
  ClientPlanViewData,
  PlanWeekData,
  PlanDayWithStatus,
} from '@/features/training/types'

export async function getClientPlanViewData(
  clientId: string
): Promise<ClientPlanViewData | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('client_plans')
    .select('id, name, weeks, start_date, end_date, status')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!plan) return null

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = getTodayISO()

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
      .in('status', ['in_progress', 'completed']),
  ])

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of sessionsResult.data ?? []) {
    const prev = sessionByDayId.get(s.client_plan_day_id)
    if (!prev || s.status === 'completed') {
      sessionByDayId.set(s.client_plan_day_id, { id: s.id, status: s.status })
    }
  }

  const planDayIds = new Set((daysResult.data ?? []).map((d) => d.id))
  const totalTrainingDays = planDayIds.size
  const completedSessions = (sessionsResult.data ?? []).filter(
    (s) => s.status === 'completed' && planDayIds.has(s.client_plan_day_id)
  ).length
  const progressPct =
    totalTrainingDays > 0
      ? Math.max(4, Math.round((completedSessions / totalTrainingDays) * 100))
      : 0

  const weekMap = new Map<number, PlanDayWithStatus[]>()
  for (const day of daysResult.data ?? []) {
    const dateISO = computeDayDate(
      plan.start_date,
      day.week_number,
      day.day_of_week
    )
    const session = sessionByDayId.get(day.id)
    const status = computeDayStatus(
      dateISO,
      todayISO,
      (session?.status as 'in_progress' | 'completed' | null) ?? null
    ) as PlanDayWithStatus['status']

    if (!weekMap.has(day.week_number)) weekMap.set(day.week_number, [])
    weekMap.get(day.week_number)!.push({
      clientPlanDayId: day.id,
      weekNumber: day.week_number,
      dayOfWeek: day.day_of_week,
      dateISO,
      status,
      existingSessionId: session?.id ?? null,
    })
  }

  const weeksByNumber: PlanWeekData[] = []
  for (let w = 1; w <= plan.weeks; w++) {
    weeksByNumber.push({ weekNumber: w, days: weekMap.get(w) ?? [] })
  }

  return {
    planId: plan.id,
    planName: plan.name,
    startDate: plan.start_date,
    endDate: plan.end_date,
    weeks: plan.weeks,
    currentWeek,
    progressPct,
    completedSessions,
    totalTrainingDays,
    weeksByNumber,
  }
}
