import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
} from '@/features/clients/utils/training-utils'
import { computeClientStatus } from '@/features/clients/utils/compute-client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'
import type {
  ClientProfileData,
  ActivePlanSummary,
  TrainingWeekData,
  DayTrainingData,
  ExerciseWithSets,
  SessionSetData,
  DayStatus,
} from '@/features/clients/types'

function localISOFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildProgressSeries(
  completedAtValues: Array<string | null>,
  activePlan: { weeks: number; startDate: string; currentWeek: number } | null,
  planDays: { id: string; week_number: number; day_of_week: number }[],
  sessionByDayId: Map<string, 'in_progress' | 'completed'>,
  todayISO: string
): Array<{
  label: string
  completed: number
  status: 'al_dia' | 'naranja' | 'riesgo' | 'sin_plan' | 'current' | 'future'
}> {
  if (!activePlan) return []

  const planStart = new Date(activePlan.startDate + 'T00:00:00Z')
  const buckets = Array.from({ length: activePlan.weeks }, (_, i) => {
    const start = new Date(planStart)
    start.setUTCDate(start.getUTCDate() + i * 7)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    return {
      label: `Sem ${i + 1}`,
      completed: 0,
      startTime: start.getTime(),
      endTime: end.getTime(),
      weekNumber: i + 1,
    }
  })

  for (const completedAt of completedAtValues) {
    if (!completedAt) continue
    const time = new Date(completedAt).getTime()
    const bucket = buckets.find((b) => time >= b.startTime && time < b.endTime)
    if (bucket) bucket.completed++
  }

  return buckets.map(({ label, completed, weekNumber }) => {
    if (weekNumber > activePlan.currentWeek) {
      return { label, completed, status: 'future' as const }
    }
    if (weekNumber === activePlan.currentWeek) {
      return { label, completed, status: 'current' as const }
    }

    const weekPlannedDays = planDays.filter((d) => d.week_number === weekNumber)
    if (weekPlannedDays.length === 0) {
      return { label, completed, status: 'sin_plan' as const }
    }

    let hasNaranja = false
    for (const day of weekPlannedDays) {
      const dateISO = computeDayDate(activePlan.startDate, day.week_number, day.day_of_week)
      if (dateISO >= todayISO) continue
      const st = sessionByDayId.get(day.id) ?? null
      if (st === null) return { label, completed, status: 'riesgo' as const }
      if (st === 'in_progress') hasNaranja = true
    }

    return { label, completed, status: hasNaranja ? ('naranja' as const) : ('al_dia' as const) }
  })
}

export async function getClientProfileData(
  clientId: string,
  coachId: string
): Promise<ClientProfileData | null> {
  const supabase = await createClient()

  // Fetch plan first so we can use its start_date as the sessions lower-bound
  const planResult = await supabase
    .from('client_plans')
    .select('id, name, weeks, start_date, end_date, status')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  const plan = planResult.data
  const sessionsFromDate = plan
    ? new Date(plan.start_date + 'T00:00:00Z').toISOString()
    : new Date(Date.now() - 56 * 86400000).toISOString()

  const [
    profileResult,
    cpResult,
    recentSessionsResult,
    totalSessionsResult,
    noteResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, coach_id')
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_profiles')
      .select('age, sex, goal, weight_kg, height_cm, experience_level, days_per_week, injuries')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('completed_at', sessionsFromDate)
      .order('completed_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed'),
    supabase
      .from('coach_notes')
      .select('content')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!profileResult.data || profileResult.data.coach_id !== coachId) return null

  const cp = cpResult.data
  const recentSessions = recentSessionsResult.data ?? []

  let activePlan: ActivePlanSummary | null = null
  if (plan) {
    activePlan = {
      id: plan.id,
      name: plan.name,
      weeks: plan.weeks,
      startDate: plan.start_date,
      endDate: plan.end_date,
      status: plan.status as 'active' | 'completed' | 'paused',
      currentWeek: getCurrentWeek(plan.start_date, plan.weeks),
    }
  }

  const totalSessions = totalSessionsResult.count ?? 0
  const coachNote = noteResult.data?.content ?? ''
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 86400000
  const daysPerWeek = cp?.days_per_week ?? 3

  const mostRecent = recentSessions[0]
  const lastSessionDate = mostRecent?.completed_at ? new Date(mostRecent.completed_at) : null
  const daysSinceLastSession = lastSessionDate
    ? Math.floor((now - lastSessionDate.getTime()) / 86400000)
    : null
  const completedInLastWeek = recentSessions.filter(
    (s) => s.completed_at && new Date(s.completed_at).getTime() >= sevenDaysAgo
  ).length
  const weeklyCompliance = calculateWeeklyCompliance({
    expectedDays: daysPerWeek,
    completedDays: completedInLastWeek,
  })

  let currentWeekData: TrainingWeekData | null = null
  if (activePlan) {
    currentWeekData = await getWeekTrainingData(
      activePlan.id,
      activePlan.currentWeek,
      activePlan.startDate,
      activePlan.weeks,
      clientId
    )
  }

  let statusPlanDays: { id: string; week_number: number; day_of_week: number }[] = []
  const statusSessionByDayId = new Map<string, 'in_progress' | 'completed'>()
  if (plan) {
    const { data: pd } = await supabase
      .from('client_plan_days')
      .select('id, week_number, day_of_week')
      .eq('client_plan_id', plan.id)
    statusPlanDays = pd ?? []
    if (statusPlanDays.length > 0) {
      const { data: sess } = await supabase
        .from('sessions')
        .select('client_plan_day_id, status')
        .in('client_plan_day_id', statusPlanDays.map((d) => d.id))
        .in('status', ['in_progress', 'completed'])
      for (const s of sess ?? []) {
        if (!s.client_plan_day_id) continue
        const st = s.status as 'in_progress' | 'completed'
        const prev = statusSessionByDayId.get(s.client_plan_day_id)
        if (!prev || st === 'completed') {
          statusSessionByDayId.set(s.client_plan_day_id, st)
        }
      }
    }
  }
  const statusTodayISO = localISOFromDate(new Date())
  const progressSeries = buildProgressSeries(
    recentSessions.map((s) => s.completed_at),
    activePlan,
    statusPlanDays,
    statusSessionByDayId,
    statusTodayISO
  )
  const status = computeClientStatus(plan, statusPlanDays, statusSessionByDayId, statusTodayISO)

  return {
    id: clientId,
    fullName: profileResult.data.full_name ?? 'Sin nombre',
    goal: cp?.goal ?? null,
    status,
    weeklyCompliance,
    daysSinceLastSession,
    totalSessions,
    age: cp?.age ?? null,
    sex: (cp?.sex as 'male' | 'female' | 'other' | null) ?? null,
    weightKg: cp?.weight_kg != null ? Number(cp.weight_kg) : null,
    heightCm: cp?.height_cm != null ? Number(cp.height_cm) : null,
    experienceLevel:
      (cp?.experience_level as 'beginner' | 'intermediate' | 'advanced' | null) ?? null,
    daysPerWeek,
    injuries: cp?.injuries ?? null,
    activePlan,
    currentWeekData,
    coachNote,
    progressSeries,
  }
}

export async function getWeekTrainingData(
  clientPlanId: string,
  weekNumber: number,
  startDate: string,
  totalWeeks: number,
  clientId: string
): Promise<TrainingWeekData> {
  const supabase = await createClient()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayISO = today.toISOString().split('T')[0]

  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week, order')
    .eq('client_plan_id', clientPlanId)
    .eq('week_number', weekNumber)
    .order('order')

  if (!planDays || planDays.length === 0) {
    const days: DayTrainingData[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
      dayOfWeek: dow,
      date: computeDayDate(startDate, weekNumber, dow),
      status: 'rest' as DayStatus,
      clientPlanDayId: null,
      sessionId: null,
      exercises: [],
    }))
    return { weekNumber, totalWeeks, days }
  }

  const planDayIds = planDays.map((d) => d.id)

  const [exercisesResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_plan_day_exercises')
      .select(
        'id, client_plan_day_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds, exercises(id, name)'
      )
      .in('client_plan_day_id', planDayIds)
      .order('order'),
    supabase
      .from('sessions')
      .select('id, client_plan_day_id, status')
      .eq('client_id', clientId)
      .in('client_plan_day_id', planDayIds),
  ])

  const sessionIds = (sessionsResult.data ?? []).map((s) => s.id)
  let allSets: Array<{
    session_id: string
    client_plan_day_exercise_id: string
    set_number: number
    weight_kg: number | null
    duration_seconds: number | null
    completed: boolean
  }> = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select(
        'session_id, client_plan_day_exercise_id, set_number, weight_kg, duration_seconds, completed'
      )
      .in('session_id', sessionIds)
      .order('set_number')
    allSets = data ?? []
  }

  const sessionByDayId = new Map((sessionsResult.data ?? []).map((s) => [s.client_plan_day_id, s]))

  const setsByKey = new Map<string, SessionSetData[]>()
  for (const set of allSets) {
    const key = `${set.session_id}:${set.client_plan_day_exercise_id}`
    if (!setsByKey.has(key)) setsByKey.set(key, [])
    setsByKey.get(key)!.push({
      setNumber: set.set_number,
      weightKg: set.weight_kg,
      durationSeconds: set.duration_seconds,
      completed: set.completed,
    })
  }

  const exercisesByDayId = new Map<string, ExerciseWithSets[]>()
  for (const ex of exercisesResult.data ?? []) {
    const dayId = ex.client_plan_day_id
    const session = sessionByDayId.get(dayId)
    const sets = session ? (setsByKey.get(`${session.id}:${ex.id}`) ?? []) : []
    const exerciseRef = ex.exercises as { id: string; name: string } | null
    if (!exercisesByDayId.has(dayId)) exercisesByDayId.set(dayId, [])
    exercisesByDayId.get(dayId)!.push({
      clientPlanDayExerciseId: ex.id,
      exerciseId: exerciseRef?.id ?? '',
      name: exerciseRef?.name ?? 'Ejercicio',
      order: ex.order,
      plannedSets: ex.sets,
      plannedRepsMin: ex.reps_min ?? null,
      plannedRepsMax: ex.reps_max ?? null,
      plannedDurationSeconds: ex.duration_seconds ?? null,
      restSeconds: ex.rest_seconds ?? null,
      sessionSets: sets,
    })
  }

  const planDayByDow = new Map(planDays.map((d) => [d.day_of_week, d]))

  const days: DayTrainingData[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => {
    const dateStr = computeDayDate(startDate, weekNumber, dow)
    const planDay = planDayByDow.get(dow)
    if (!planDay) {
      return {
        dayOfWeek: dow,
        date: dateStr,
        status: 'rest' as DayStatus,
        clientPlanDayId: null,
        sessionId: null,
        exercises: [],
      }
    }
    const session = sessionByDayId.get(planDay.id) ?? null
    const exercises = exercisesByDayId.get(planDay.id) ?? []
    const status = computeDayStatus(
      dateStr,
      todayISO,
      (session?.status as 'completed' | 'in_progress' | null) ?? null
    )
    return {
      dayOfWeek: dow,
      date: dateStr,
      status,
      clientPlanDayId: planDay.id,
      sessionId: session?.id ?? null,
      exercises,
    }
  })

  return { weekNumber, totalWeeks, days }
}

export type PlanFollowupIssue = {
  weekNumber: number
  dayOfWeek: number
}

export type PlanFollowupStatusSummary = {
  missed: PlanFollowupIssue[]
  inProgress: PlanFollowupIssue[]
}

export async function getPlanFollowupStatusSummary(
  clientPlanId: string,
  startDate: string,
  totalWeeks: number,
  currentWeek: number,
  clientId: string
): Promise<PlanFollowupStatusSummary> {
  const upperWeek = Math.max(1, Math.min(currentWeek, totalWeeks))
  const weekNumbers = Array.from({ length: upperWeek }, (_, idx) => idx + 1)
  const weeks = await Promise.all(
    weekNumbers.map((weekNumber) =>
      getWeekTrainingData(clientPlanId, weekNumber, startDate, totalWeeks, clientId)
    )
  )

  const missed: PlanFollowupIssue[] = []
  const inProgress: PlanFollowupIssue[] = []

  for (const week of weeks) {
    for (const day of week.days) {
      if (day.status === 'past_missed') {
        missed.push({ weekNumber: week.weekNumber, dayOfWeek: day.dayOfWeek })
      } else if (day.status === 'in_progress') {
        inProgress.push({ weekNumber: week.weekNumber, dayOfWeek: day.dayOfWeek })
      }
    }
  }

  return { missed, inProgress }
}
