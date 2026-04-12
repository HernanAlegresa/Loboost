import { createClient } from '@/lib/supabase/server'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
  getTodayISO,
} from '@/features/clients/utils/training-utils'
import type { WeekStripDay } from '@/features/training/types'

export type ClientNotificationData = {
  inProgressSession: { sessionId: string } | null
  weekStrip: WeekStripDay[] | null
}

export async function getClientNotificationData(
  clientId: string
): Promise<ClientNotificationData> {
  const supabase = await createClient()

  const [planResult, inProgResult] = await Promise.all([
    supabase
      .from('client_plans')
      .select('id, weeks, start_date')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle(),
  ])

  const inProgressSession = inProgResult.data?.id
    ? { sessionId: inProgResult.data.id }
    : null

  const plan = planResult.data
  if (!plan) return { inProgressSession, weekStrip: null }

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = getTodayISO()

  const { data: currentWeekDays } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week')
    .eq('client_plan_id', plan.id)
    .eq('week_number', currentWeek)

  if (!currentWeekDays || currentWeekDays.length === 0) {
    return { inProgressSession, weekStrip: null }
  }

  const dayIds = currentWeekDays.map((d) => d.id)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('client_id', clientId)
    .in('client_plan_day_id', dayIds)
    .in('status', ['in_progress', 'completed'])

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of sessions ?? []) {
    sessionByDayId.set(s.client_plan_day_id, { id: s.id, status: s.status })
  }

  const weekStrip: WeekStripDay[] = []
  for (let dow = 1; dow <= 7; dow++) {
    const pd = currentWeekDays.find((d) => d.day_of_week === dow)
    if (!pd) {
      weekStrip.push({ dayOfWeek: dow, status: 'rest' })
      continue
    }
    const dateISO = computeDayDate(plan.start_date, currentWeek, dow)
    const sess = sessionByDayId.get(pd.id)
    const status = computeDayStatus(
      dateISO,
      todayISO,
      (sess?.status as 'in_progress' | 'completed' | null) ?? null
    )
    weekStrip.push({ dayOfWeek: dow, status, clientPlanDayId: pd.id, dateISO })
  }

  return { inProgressSession, weekStrip }
}
