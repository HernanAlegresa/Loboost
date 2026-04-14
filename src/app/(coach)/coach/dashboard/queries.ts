import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import { getClientAlerts } from '@/lib/analytics/alerts'
import type { AlertType } from '@/types/domain'

/** Estado de lista coach: color y filtro 1:1 */
export type CoachClientListState = 'al_dia' | 'atencion' | 'critico' | 'en_pausa' | 'inactivo'

export type DashboardClientSummary = {
  id: string
  fullName: string
  goal: string | null
  daysPerWeek: number
  hasActivePlan: boolean
  planStatus: 'active' | 'paused' | 'inactive'
  trackingStatus: 'on_track' | 'attention' | 'critical' | null
  lastSessionDate: Date | null
  daysSinceLastSession: number | null
  weeklyCompliance: number
  alerts: AlertType[]
  listState: CoachClientListState
}

export type DashboardData = {
  clients: DashboardClientSummary[]
  totalClients: number
  activeClients: number
  momentumPercent: number
  sparklineData: number[]
}

export async function getDashboardData(coachId: string): Promise<DashboardData> {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_id', coachId)
    .eq('role', 'client')

  if (!profiles || profiles.length === 0) {
    return {
      clients: [],
      totalClients: 0,
      activeClients: 0,
      momentumPercent: 0,
      sparklineData: Array(7).fill(0),
    }
  }

  const clientIds = profiles.map((p) => p.id)

  const [clientProfilesResult, activePlansResult, allPlansResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('id, goal, days_per_week')
      .in('id', clientIds),
    supabase
      .from('client_plans')
      .select('client_id')
      .in('client_id', clientIds)
      .eq('status', 'active'),
    supabase
      .from('client_plans')
      .select('client_id, status, created_at')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('client_id, completed_at')
      .in('client_id', clientIds)
      .eq('status', 'completed')
      .gte(
        'completed_at',
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('completed_at', { ascending: false }),
  ])

  const clientProfilesMap = new Map(
    (clientProfilesResult.data ?? []).map((cp) => [cp.id, cp])
  )
  const activePlanClientIds = new Set(
    (activePlansResult.data ?? []).map((p) => p.client_id)
  )
  const latestPlanStatusMap = new Map<string, 'active' | 'paused' | 'completed'>()
  for (const plan of allPlansResult.data ?? []) {
    if (!latestPlanStatusMap.has(plan.client_id)) {
      latestPlanStatusMap.set(plan.client_id, plan.status as 'active' | 'paused' | 'completed')
    }
  }

  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const sevenDaysAgo = now - sevenDaysMs
  const allSessions = sessionsResult.data ?? []

  // Inicio de la semana actual (lunes a las 00:00)
  const todayDate = new Date(now)
  const daysSinceMonday = (todayDate.getDay() + 6) % 7 // Dom=0→6, Lun=0, ..., Sab=6
  const startOfWeek = new Date(todayDate)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)

  // sparklineData[0]=Lun, [1]=Mar, [2]=Mié, [3]=Jue, [4]=Vie, [5]=Sáb, [6]=Dom
  const sparklineData: number[] = Array(7).fill(0)
  let currentWeekCount = 0
  let prevWeekCount = 0

  for (const session of allSessions) {
    if (!session.completed_at) continue
    const sessionDate = new Date(session.completed_at)
    const sessionTime = sessionDate.getTime()
    if (sessionTime >= startOfWeek.getTime()) {
      currentWeekCount++
      const isoDay = (sessionDate.getDay() + 6) % 7 // Lun=0 … Dom=6
      sparklineData[isoDay]++
    } else if (sessionTime >= sevenDaysAgo) {
      prevWeekCount++
    }
  }

  const momentumPercent =
    prevWeekCount === 0
      ? currentWeekCount > 0 ? 100 : 0
      : Math.round(((currentWeekCount - prevWeekCount) / prevWeekCount) * 100)

  const clients: DashboardClientSummary[] = profiles.map((profile) => {
    const cp = clientProfilesMap.get(profile.id)
    const hasActivePlan = activePlanClientIds.has(profile.id)
    const latestPlanStatus = latestPlanStatusMap.get(profile.id)
    const planStatus: 'active' | 'paused' | 'inactive' = hasActivePlan
      ? 'active'
      : latestPlanStatus === 'paused'
      ? 'paused'
      : 'inactive'
    const daysPerWeek = cp?.days_per_week ?? 3

    const clientSessions = allSessions.filter((s) => s.client_id === profile.id)
    const mostRecent = clientSessions[0]
    const lastSessionDate =
      mostRecent?.completed_at ? new Date(mostRecent.completed_at) : null

    const daysSinceLastSession =
      lastSessionDate !== null
        ? Math.floor((now - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

    const completedInLastWeek = clientSessions.filter((s) => {
      if (!s.completed_at) return false
      return new Date(s.completed_at).getTime() >= sevenDaysAgo
    }).length

    const weeklyCompliance = calculateWeeklyCompliance({
      expectedDays: daysPerWeek,
      completedDays: completedInLastWeek,
    })

    const trackingStatus: 'on_track' | 'attention' | 'critical' | null = hasActivePlan
      ? daysSinceLastSession === null || daysSinceLastSession > 7
        ? 'critical'
        : daysSinceLastSession > 3
        ? 'attention'
        : 'on_track'
      : null

    const alerts = getClientAlerts({
      lastSessionDate,
      weeklyCompliance,
      hasActivePlan,
    })

    let listState: CoachClientListState
    if (planStatus === 'paused') {
      listState = 'en_pausa'
    } else if (planStatus === 'inactive') {
      listState = 'inactivo'
    } else if (trackingStatus === 'on_track') {
      listState = 'al_dia'
    } else if (trackingStatus === 'attention') {
      listState = 'atencion'
    } else {
      listState = 'critico'
    }

    return {
      id: profile.id,
      fullName: profile.full_name ?? 'Sin nombre',
      goal: cp?.goal ?? null,
      daysPerWeek,
      hasActivePlan,
      planStatus,
      trackingStatus,
      lastSessionDate,
      daysSinceLastSession,
      weeklyCompliance,
      alerts,
      listState,
    }
  })

  return {
    clients,
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.hasActivePlan).length,
    momentumPercent,
    sparklineData,
  }
}
