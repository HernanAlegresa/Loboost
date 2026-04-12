import { createClient } from '@/lib/supabase/server'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
  getTodayISO,
} from '@/features/clients/utils/training-utils'
import type {
  ClientDashboardData,
  ClientActivePlan,
  TodayDayData,
  TodayExercise,
  WeekStripDay,
} from '@/features/training/types'

export async function getClientDashboardData(
  clientId: string
): Promise<ClientDashboardData> {
  const supabase = await createClient()

  const [profileResult, planResult, inProgResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', clientId).single(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
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

  const fullName = profileResult.data?.full_name ?? 'Cliente'
  const plan = planResult.data
  const inProgressSession = inProgResult.data?.id
    ? { sessionId: inProgResult.data.id }
    : null

  if (!plan) {
    return {
      fullName,
      activePlan: null,
      today: null,
      weekStrip: null,
      inProgressSession,
    }
  }

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = getTodayISO()

  // Fetch all plan days across all weeks — needed for progress calculation and weekStrip
  const { data: allPlanDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week')
    .eq('client_plan_id', plan.id)

  if (!allPlanDays || allPlanDays.length === 0) {
    return {
      fullName,
      activePlan: {
        id: plan.id,
        name: plan.name,
        weeks: plan.weeks,
        currentWeek,
        startDate: plan.start_date,
        endDate: plan.end_date,
        progressPct: 0,
      },
      today: null,
      weekStrip: null,
      inProgressSession,
    }
  }

  const allPlanDayIds = allPlanDays.map((d) => d.id)

  // Count completed sessions to compute real progress (training days done / total training days)
  const { count: completedCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .in('client_plan_day_id', allPlanDayIds)

  const totalTrainingDays = allPlanDayIds.length
  const progressPct =
    totalTrainingDays > 0
      ? Math.max(4, Math.round(((completedCount ?? 0) / totalTrainingDays) * 100))
      : 0

  const activePlan: ClientActivePlan = {
    id: plan.id,
    name: plan.name,
    weeks: plan.weeks,
    currentWeek,
    startDate: plan.start_date,
    endDate: plan.end_date,
    progressPct,
  }

  const currentWeekDays = allPlanDays.filter((d) => d.week_number === currentWeek)

  if (currentWeekDays.length === 0) {
    return {
      fullName,
      activePlan,
      today: null,
      weekStrip: null,
      inProgressSession,
    }
  }

  const currentWeekDayIds = currentWeekDays.map((d) => d.id)
  const { data: weekSessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, status')
    .eq('client_id', clientId)
    .in('client_plan_day_id', currentWeekDayIds)
    .in('status', ['in_progress', 'completed'])

  const sessionByDayId = new Map<string, { id: string; status: string }>()
  for (const s of weekSessions ?? []) {
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

  const todayPlanDay = currentWeekDays.find(
    (d) =>
      computeDayDate(plan.start_date, currentWeek, d.day_of_week) === todayISO
  )

  if (!todayPlanDay) {
    return {
      fullName,
      activePlan,
      today: null,
      weekStrip,
      inProgressSession,
    }
  }

  const [exercisesResult, sessionResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select('id, order, sets, reps, duration_seconds, exercises(name)')
      .eq('client_plan_day_id', todayPlanDay.id)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('client_plan_day_id', todayPlanDay.id)
      .in('status', ['in_progress', 'completed'])
      .maybeSingle(),
  ])

  const exercises: TodayExercise[] = (exercisesResult.data ?? []).map((ex) => {
    // Supabase may return the joined relation as an object or array depending on the FK cardinality
    const exData = ex.exercises as { name: string } | { name: string }[] | null
    const name = Array.isArray(exData)
      ? (exData[0]?.name ?? 'Ejercicio')
      : (exData?.name ?? 'Ejercicio')
    return {
      clientPlanDayExerciseId: ex.id,
      name,
      order: ex.order,
      plannedSets: ex.sets,
      plannedReps: ex.reps ?? null,
      plannedDurationSeconds: ex.duration_seconds ?? null,
    }
  })

  const today: TodayDayData = {
    clientPlanDayId: todayPlanDay.id,
    dayOfWeek: todayPlanDay.day_of_week,
    exercises,
    existingSessionId: sessionResult.data?.id ?? null,
    sessionStatus:
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }

  return { fullName, activePlan, today, weekStrip, inProgressSession }
}
