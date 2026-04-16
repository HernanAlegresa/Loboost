import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import {
  getCurrentWeek,
  computeDayDate,
  computeDayStatus,
} from '@/features/clients/utils/training-utils'
import type {
  ClientProfileData,
  ActivePlanSummary,
  TrainingWeekData,
  DayTrainingData,
  ExerciseWithSets,
  SessionSetData,
  DayStatus,
} from '@/features/clients/types'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysSinceMonday)
  return d
}

function buildProgressSeries(completedAtValues: Array<string | null>): Array<{ label: string; completed: number }> {
  const now = new Date()
  const currentWeekStart = startOfWeek(now)
  const buckets: Array<{ label: string; completed: number; start: Date; end: Date }> = []

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
    buckets.push({ label, completed: 0, start: weekStart, end: weekEnd })
  }

  for (const completedAt of completedAtValues) {
    if (!completedAt) continue
    const date = new Date(completedAt)
    const time = date.getTime()
    for (const bucket of buckets) {
      if (time >= bucket.start.getTime() && time < bucket.end.getTime()) {
        bucket.completed++
        break
      }
    }
  }

  return buckets.map((b) => ({ label: b.label, completed: b.completed }))
}

export async function getClientProfileData(
  clientId: string,
  coachId: string
): Promise<ClientProfileData | null> {
  const supabase = await createClient()

  const [
    profileResult,
    cpResult,
    planResult,
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
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 56 * 86400000).toISOString())
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
  const plan = planResult.data
  const recentSessions = recentSessionsResult.data ?? []
  const progressSeries = buildProgressSeries(recentSessions.map((s) => s.completed_at))
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

  const hasActivePlan = plan !== null
  let statusColor: 'active' | 'warning' | 'critical'
  if (!hasActivePlan || (daysSinceLastSession !== null && daysSinceLastSession > 7)) {
    statusColor = 'critical'
  } else if (daysSinceLastSession !== null && daysSinceLastSession > 3) {
    statusColor = 'warning'
  } else {
    statusColor = 'active'
  }

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

  return {
    id: clientId,
    fullName: profileResult.data.full_name ?? 'Sin nombre',
    goal: cp?.goal ?? null,
    statusColor,
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
        'id, client_plan_day_id, order, sets, reps, duration_seconds, rest_seconds, exercises(id, name)'
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
      plannedReps: ex.reps ?? null,
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
