import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import { getClientAlerts } from '@/lib/analytics/alerts'
import {
  computeDayDate,
  computeDayStatus,
  getCurrentWeek,
  getTodayISO,
} from '@/features/clients/utils/training-utils'
import { computeClientStatus } from '@/features/clients/utils/compute-client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'
import type { DayStatus } from '@/features/clients/types'
import type { AlertType } from '@/types/domain'
import type {
  CoachWeeklyHeatmap,
  WeeklyHeatmapCell,
  WeeklyHeatmapCellKind,
  WeeklyHeatmapRow,
} from './weekly-heatmap-types'

export type {
  CoachWeeklyHeatmap,
  WeeklyHeatmapCell,
  WeeklyHeatmapCellKind,
  WeeklyHeatmapRow,
} from './weekly-heatmap-types'

/** Estado de lista coach: color y filtro 1:1 */
export type CoachClientListState = 'al_dia' | 'atencion' | 'critico' | 'en_pausa' | 'inactivo'

export type DashboardClientSummary = {
  id: string
  fullName: string
  goal: string | null
  daysPerWeek: number
  completedThisWeek: number
  hasActivePlan: boolean
  planStatus: 'active' | 'paused' | 'inactive'
  status: ClientStatus
  lastSessionDate: Date | null
  daysSinceLastSession: number | null
  weeklyCompliance: number
  alerts: AlertType[]
  activePlanEndDate: string | null
}

export type DashboardData = {
  clients: DashboardClientSummary[]
  totalClients: number
  activeClients: number
  momentumPercent: number
  sparklineData: number[]
  weeklyHeatmap: CoachWeeklyHeatmap
}

/** Clientes con seguimiento activo que el coach debería revisar primero (riesgo + atención). */
export function countCoachClientsNeedingAttention(clients: DashboardClientSummary[]): number {
  return clients.filter((c) => c.status === 'riesgo' || c.status === 'atencion').length
}

function localISOFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayStatusToHeatmapKind(status: DayStatus): WeeklyHeatmapCellKind {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'in_progress':
      return 'in_progress'
    case 'upcoming':
    case 'today':
      return 'upcoming'
    case 'past_missed':
      return 'missed'
    case 'rest':
      return 'rest'
  }
}

function buildCoachWeeklyHeatmap(
  profiles: { id: string; full_name: string | null }[],
  activePlanRows: { id: string; client_id: string; start_date: string; weeks: number }[],
  planDaysRows: { id: string; client_plan_id: string; week_number: number; day_of_week: number }[],
  heatmapSessions: { client_plan_day_id: string; status: string }[],
  startOfWeek: Date
): CoachWeeklyHeatmap {
  const todayISO = getTodayISO()
  const weekColumnISOs: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    weekColumnISOs.push(localISOFromDate(d))
  }
  const weekMondayISO = weekColumnISOs[0] ?? todayISO

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const dayShortLabels = weekColumnISOs.map((iso, i) => {
    const dom = Number(iso.slice(8, 10))
    return `${dayNames[i]} ${dom}`
  })

  const todayColumnIndexRaw = weekColumnISOs.findIndex((iso) => iso === todayISO)
  const todayColumnIndex = todayColumnIndexRaw >= 0 ? todayColumnIndexRaw : 0

  const activePlanByClientId = new Map<
    string,
    { planId: string; start_date: string; weeks: number }
  >()
  for (const p of activePlanRows) {
    activePlanByClientId.set(p.client_id, {
      planId: p.id,
      start_date: p.start_date,
      weeks: p.weeks,
    })
  }

  const planDaysByPlanId = new Map<
    string,
    { id: string; week_number: number; day_of_week: number }[]
  >()
  for (const row of planDaysRows) {
    const list = planDaysByPlanId.get(row.client_plan_id) ?? []
    list.push({
      id: row.id,
      week_number: row.week_number,
      day_of_week: row.day_of_week,
    })
    planDaysByPlanId.set(row.client_plan_id, list)
  }

  const sessionByPlanDayId = new Map<string, 'in_progress' | 'completed'>()
  for (const s of heatmapSessions) {
    const st = s.status as 'in_progress' | 'completed'
    const prev = sessionByPlanDayId.get(s.client_plan_day_id)
    if (!prev || st === 'completed') {
      sessionByPlanDayId.set(s.client_plan_day_id, st)
    }
  }

  const rows: WeeklyHeatmapRow[] = []
  for (const profile of profiles) {
    const planMeta = activePlanByClientId.get(profile.id)
    if (!planMeta) continue

    const days = planDaysByPlanId.get(planMeta.planId) ?? []
    const cells: WeeklyHeatmapCell[] = []

    for (const dateISO of weekColumnISOs) {
      const isToday = dateISO === todayISO
      const planDay = days.find(
        (pd) => computeDayDate(planMeta.start_date, pd.week_number, pd.day_of_week) === dateISO
      )
      if (!planDay) {
        cells.push({ kind: 'rest', isToday })
        continue
      }
      const sessionStatus = sessionByPlanDayId.get(planDay.id) ?? null
      const daySt = computeDayStatus(
        dateISO,
        todayISO,
        sessionStatus
      )
      cells.push({ kind: dayStatusToHeatmapKind(daySt), isToday })
    }

    const hasScheduledTrainingThisWeek = cells.some((c) => c.kind !== 'rest')
    if (!hasScheduledTrainingThisWeek) continue

    rows.push({
      clientId: profile.id,
      fullName: profile.full_name ?? 'Sin nombre',
      cells,
    })
  }

  rows.sort((a, b) => {
    const missedA = a.cells.filter((c) => c.kind === 'missed').length
    const missedB = b.cells.filter((c) => c.kind === 'missed').length
    if (missedA !== missedB) return missedB - missedA
    return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
  })

  return { weekMondayISO, todayColumnIndex, dayShortLabels, rows }
}

export async function getDashboardData(coachId: string): Promise<DashboardData> {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_id', coachId)
    .eq('role', 'client')

  const todayDate = new Date()
  const daysSinceMondayEarly = (todayDate.getDay() + 6) % 7
  const startOfWeekEmpty = new Date(todayDate)
  startOfWeekEmpty.setHours(0, 0, 0, 0)
  startOfWeekEmpty.setDate(startOfWeekEmpty.getDate() - daysSinceMondayEarly)

  if (!profiles || profiles.length === 0) {
    return {
      clients: [],
      totalClients: 0,
      activeClients: 0,
      momentumPercent: 0,
      sparklineData: Array(7).fill(0),
      weeklyHeatmap: buildCoachWeeklyHeatmap([], [], [], [], startOfWeekEmpty),
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
      .select('id, client_id, start_date, weeks, end_date')
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
  const activePlanRows = activePlansResult.data ?? []
  const activePlanClientIds = new Set(activePlanRows.map((p) => p.client_id))
  const activePlanIds = activePlanRows.map((p) => p.id)
  const activePlanEndDateMap = new Map<string, string | null>(
    activePlanRows.map((p) => [p.client_id, p.end_date])
  )

  let planDaysRows: {
    id: string
    client_plan_id: string
    week_number: number
    day_of_week: number
  }[] = []
  let heatmapSessions: { client_plan_day_id: string; status: string }[] = []

  if (activePlanIds.length > 0) {
    const { data: pd } = await supabase
      .from('client_plan_days')
      .select('id, client_plan_id, week_number, day_of_week')
      .in('client_plan_id', activePlanIds)

    planDaysRows = pd ?? []
    const planDayIds = planDaysRows.map((d) => d.id)

    if (planDayIds.length > 0) {
      const { data: hs } = await supabase
        .from('sessions')
        .select('client_plan_day_id, status')
        .in('client_plan_day_id', planDayIds)
        .in('status', ['in_progress', 'completed'])

      heatmapSessions = hs ?? []
    }
  }
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

  // Inicio de la semana actual (lunes a las 00:00, fecha local)
  const daysSinceMonday = (todayDate.getDay() + 6) % 7 // Dom=0→6, Lun=0, ..., Sab=6
  const startOfWeek = new Date(todayDate)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)

  const weeklyHeatmap = buildCoachWeeklyHeatmap(
    profiles,
    activePlanRows,
    planDaysRows,
    heatmapSessions,
    startOfWeek
  )

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

  const clients: DashboardClientSummary[] = await Promise.all(
    profiles.map(async (profile) => {
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

      const alerts = getClientAlerts({
        lastSessionDate,
        weeklyCompliance,
        hasActivePlan,
      })

      const activePlanRow = activePlanRows.find((p) => p.client_id === profile.id) ?? null
      const activePlan = activePlanRow
        ? {
            id: activePlanRow.id,
            name: '',
            weeks: activePlanRow.weeks,
            currentWeek: getCurrentWeek(activePlanRow.start_date, activePlanRow.weeks),
            startDate: activePlanRow.start_date,
            endDate: activePlanRow.end_date,
            status: 'active' as const,
            daysPerWeek: daysPerWeek,
          }
        : null

      const status: ClientStatus = await computeClientStatus(profile.id, activePlan)

      return {
        id: profile.id,
        fullName: profile.full_name ?? 'Sin nombre',
        goal: cp?.goal ?? null,
        daysPerWeek,
        completedThisWeek: completedInLastWeek,
        hasActivePlan,
        planStatus,
        status,
        lastSessionDate,
        daysSinceLastSession,
        weeklyCompliance,
        alerts,
        activePlanEndDate: activePlanEndDateMap.get(profile.id) ?? null,
      }
    })
  )

  return {
    clients,
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.hasActivePlan).length,
    momentumPercent,
    sparklineData,
    weeklyHeatmap,
  }
}
