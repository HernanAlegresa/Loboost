import { createClient } from '@/lib/supabase/server'
import { getCurrentWeek } from '@/features/clients/utils/training-utils'
import type { ActivePlanSummary } from '@/features/clients/types'

// ── Types ────────────────────────────────────────────────────────────────────

export type ProgressKPIs = {
  weightInitialKg: number | null
  weightCurrentKg: number | null
  weightDeltaKg: number | null
  checkInsSubmitted: number
  checkInsExpected: number
}

export type CheckInEntry = {
  id: string
  date: string
  weekNumber: number
  weightKg: number | null
  notes: string | null
}

export type CheckInWeek = {
  weekNumber: number
  weekStartDate: string
  weekEndDate: string
  entry: CheckInEntry | null
  isFuture: boolean
}

export type CheckInsSummary = {
  weeks: CheckInWeek[]
  totalPlanWeeks: number
  submittedCount: number
  currentWeek: number
}

export type ExerciseSetPoint = {
  date: string
  weekNumber: number
  topSetKg: number | null
  completedSets: number
}

export type ExerciseProgressData = {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  lastTopSetKg: number | null
  peakTopSetKg: number | null
  sessionCount: number
  trend: 'up' | 'down' | 'stable' | 'none'
  sessions: ExerciseSetPoint[]
}

export type WeeklyLoadPoint = {
  weekNumber: number
  weekLabel: string
  completedSets: number
  tonnageKg: number
  avgIntensityKg: number | null
  sessionCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function getWeekDateRange(planStartDate: string, weekNumber: number): { start: string; end: string } {
  const start = addDays(planStartDate, (weekNumber - 1) * 7)
  const end = addDays(start, 6)
  return { start, end }
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getClientBasicForCoach(
  clientId: string,
  coachId: string
): Promise<{ fullName: string; activePlan: ActivePlanSummary | null } | null> {
  const supabase = await createClient()

  const [profileRes, planRes] = await Promise.all([
    supabase.from('profiles').select('full_name, coach_id').eq('id', clientId).single(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (!profileRes.data || profileRes.data.coach_id !== coachId) return null

  const plan = planRes.data
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

  return { fullName: profileRes.data.full_name ?? 'Cliente', activePlan }
}

export async function getProgressKPIs(
  clientId: string,
  weightKgFromProfile: number | null,
  activePlan: ActivePlanSummary | null
): Promise<ProgressKPIs> {
  const supabase = await createClient()

  const { data: measurements } = await supabase
    .from('body_measurements')
    .select('weight_kg, date')
    .eq('client_id', clientId)
    .order('date', { ascending: true })

  const meas = measurements ?? []
  const planMeas = activePlan ? meas.filter((m) => m.date >= activePlan.startDate) : meas

  const latestMeas = planMeas.length > 0 ? planMeas[planMeas.length - 1] : null
  const weightCurrentKg = latestMeas?.weight_kg != null ? Number(latestMeas.weight_kg) : null
  const weightInitialKg = weightKgFromProfile
  const weightDeltaKg =
    weightInitialKg != null && weightCurrentKg != null
      ? Math.round((weightCurrentKg - weightInitialKg) * 10) / 10
      : null

  let checkInsSubmitted = 0
  let checkInsExpected = 0
  if (activePlan) {
    checkInsExpected = activePlan.currentWeek
    // One check-in per week: count unique weeks that have a measurement
    const weeksWithMeas = new Set<number>()
    for (const m of planMeas) {
      const dayOffset = Math.floor(
        (new Date(m.date + 'T00:00:00Z').getTime() -
          new Date(activePlan.startDate + 'T00:00:00Z').getTime()) /
          (7 * 86400000)
      )
      const week = Math.min(dayOffset + 1, activePlan.weeks)
      if (week >= 1) weeksWithMeas.add(week)
    }
    checkInsSubmitted = Math.min(weeksWithMeas.size, checkInsExpected)
  }

  return { weightInitialKg, weightCurrentKg, weightDeltaKg, checkInsSubmitted, checkInsExpected }
}

export async function getCheckInsSummary(
  clientId: string,
  activePlan: ActivePlanSummary
): Promise<CheckInsSummary> {
  const supabase = await createClient()
  const today = getTodayISO()

  const { data: measurements } = await supabase
    .from('body_measurements')
    .select('id, date, weight_kg, notes')
    .eq('client_id', clientId)
    .gte('date', activePlan.startDate)
    .order('date', { ascending: true })

  const meas = measurements ?? []
  const weeks: CheckInWeek[] = []

  for (let w = 1; w <= activePlan.weeks; w++) {
    const { start, end } = getWeekDateRange(activePlan.startDate, w)
    const isFuture = start > today
    const weekMeas = meas.filter((m) => m.date >= start && m.date <= end)
    const latest = weekMeas.length > 0 ? weekMeas[weekMeas.length - 1] : null
    const entry: CheckInEntry | null = latest
      ? {
          id: latest.id,
          date: latest.date,
          weekNumber: w,
          weightKg: latest.weight_kg != null ? Number(latest.weight_kg) : null,
          notes: latest.notes,
        }
      : null
    weeks.push({ weekNumber: w, weekStartDate: start, weekEndDate: end, entry, isFuture })
  }

  const submittedCount = weeks.filter((w) => w.entry !== null).length
  return { weeks, totalPlanWeeks: activePlan.weeks, submittedCount, currentWeek: activePlan.currentWeek }
}

export async function getExerciseProgressData(
  clientId: string,
  activePlan: ActivePlanSummary
): Promise<ExerciseProgressData[]> {
  const supabase = await createClient()

  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number')
    .eq('client_plan_id', activePlan.id)

  if (!planDays || planDays.length === 0) return []

  const planDayIds = planDays.map((d) => d.id)
  const weekByDayId = new Map(planDays.map((d) => [d.id, d.week_number]))

  const { data: planDayExercises } = await supabase
    .from('client_plan_day_exercises')
    .select('id, client_plan_day_id, exercise_id, exercises(id, name, muscle_group, type)')
    .in('client_plan_day_id', planDayIds)

  if (!planDayExercises || planDayExercises.length === 0) return []

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, date')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const sessionDateById = new Map(sessions.map((s) => [s.id, s.date]))
  const sessionPlanDayById = new Map(sessions.map((s) => [s.id, s.client_plan_day_id]))

  const { data: sessionSets } = await supabase
    .from('session_sets')
    .select('session_id, client_plan_day_exercise_id, weight_kg, set_number')
    .in('session_id', sessionIds)
    .eq('completed', true)

  if (!sessionSets || sessionSets.length === 0) return []

  const exerciseIdByPdeId = new Map<string, string>()
  const exerciseInfoById = new Map<string, { name: string; muscleGroup: string }>()

  for (const pde of planDayExercises) {
    const exRef = pde.exercises as { id: string; name: string; muscle_group: string; type: string } | null
    // Solo ejercicios de fuerza — el progreso de cardio no aplica
    if (exRef && exRef.type === 'strength') {
      exerciseIdByPdeId.set(pde.id, exRef.id)
      exerciseInfoById.set(exRef.id, { name: exRef.name, muscleGroup: exRef.muscle_group })
    }
  }

  type SessionAgg = { topSetKg: number | null; completedSets: number; date: string; weekNumber: number }
  const exerciseSessionMap = new Map<string, Map<string, SessionAgg>>()

  for (const set of sessionSets) {
    const exerciseId = exerciseIdByPdeId.get(set.client_plan_day_exercise_id)
    if (!exerciseId) continue
    const date = sessionDateById.get(set.session_id)
    if (!date) continue
    const planDayId = sessionPlanDayById.get(set.session_id)
    if (!planDayId) continue
    const weekNumber = weekByDayId.get(planDayId) ?? 0

    if (!exerciseSessionMap.has(exerciseId)) exerciseSessionMap.set(exerciseId, new Map())
    const sessMap = exerciseSessionMap.get(exerciseId)!

    if (!sessMap.has(set.session_id)) {
      sessMap.set(set.session_id, { topSetKg: null, completedSets: 0, date, weekNumber })
    }
    const entry = sessMap.get(set.session_id)!
    entry.completedSets++
    if (set.weight_kg != null) {
      const kg = Number(set.weight_kg)
      if (entry.topSetKg === null || kg > entry.topSetKg) entry.topSetKg = kg
    }
  }

  const result: ExerciseProgressData[] = []

  for (const [exerciseId, sessMap] of exerciseSessionMap) {
    const info = exerciseInfoById.get(exerciseId)
    if (!info) continue

    const sessionList: ExerciseSetPoint[] = Array.from(sessMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    const withWeight = sessionList.filter((s) => s.topSetKg !== null)
    const lastTopSetKg = withWeight.length > 0 ? withWeight[withWeight.length - 1].topSetKg : null
    const peakTopSetKg = withWeight.length > 0 ? Math.max(...withWeight.map((s) => s.topSetKg!)) : null

    let trend: 'up' | 'down' | 'stable' | 'none' = 'none'
    if (withWeight.length >= 2) {
      const prev = withWeight[withWeight.length - 2].topSetKg!
      const last = withWeight[withWeight.length - 1].topSetKg!
      if (last > prev) trend = 'up'
      else if (last < prev) trend = 'down'
      else trend = 'stable'
    }

    result.push({
      exerciseId,
      exerciseName: info.name,
      muscleGroup: info.muscleGroup,
      lastTopSetKg,
      peakTopSetKg,
      sessionCount: sessionList.length,
      trend,
      sessions: sessionList,
    })
  }

  return result.sort((a, b) => b.sessionCount - a.sessionCount)
}

export async function getWeeklyLoadData(
  clientId: string,
  activePlan: ActivePlanSummary
): Promise<WeeklyLoadPoint[]> {
  const supabase = await createClient()

  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number')
    .eq('client_plan_id', activePlan.id)

  const emptyWeeks = (): WeeklyLoadPoint[] =>
    Array.from({ length: activePlan.currentWeek }, (_, i) => ({
      weekNumber: i + 1,
      weekLabel: `S${i + 1}`,
      completedSets: 0,
      tonnageKg: 0,
      avgIntensityKg: null,
      sessionCount: 0,
    }))

  if (!planDays || planDays.length === 0) return emptyWeeks()

  const planDayIds = planDays.map((d) => d.id)
  const weekByDayId = new Map(planDays.map((d) => [d.id, d.week_number]))

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  if (!sessions || sessions.length === 0) return emptyWeeks()

  const sessionIds = sessions.map((s) => s.id)
  const sessionWeekMap = new Map<string, number>()
  for (const s of sessions) {
    const week = weekByDayId.get(s.client_plan_day_id) ?? 0
    sessionWeekMap.set(s.id, week)
  }

  const { data: sessionSets } = await supabase
    .from('session_sets')
    .select('session_id, weight_kg')
    .in('session_id', sessionIds)
    .eq('completed', true)

  type WeekAgg = { totalWeightKg: number; setCount: number; weightedCount: number; sessionIds: Set<string> }
  const weekAgg = new Map<number, WeekAgg>()

  for (const set of sessionSets ?? []) {
    const week = sessionWeekMap.get(set.session_id) ?? 0
    if (week === 0) continue
    if (!weekAgg.has(week)) {
      weekAgg.set(week, { totalWeightKg: 0, setCount: 0, weightedCount: 0, sessionIds: new Set() })
    }
    const agg = weekAgg.get(week)!
    agg.sessionIds.add(set.session_id)
    agg.setCount++
    if (set.weight_kg != null) {
      agg.totalWeightKg += Number(set.weight_kg)
      agg.weightedCount++
    }
  }

  return Array.from({ length: activePlan.currentWeek }, (_, i) => {
    const w = i + 1
    const { start } = getWeekDateRange(activePlan.startDate, w)
    const agg = weekAgg.get(w)
    return {
      weekNumber: w,
      weekLabel: `S${w} · ${start.slice(5, 10).replace('-', '/')}`,
      completedSets: agg?.setCount ?? 0,
      tonnageKg: Math.round(agg?.totalWeightKg ?? 0),
      avgIntensityKg:
        agg && agg.weightedCount > 0
          ? Math.round((agg.totalWeightKg / agg.weightedCount) * 10) / 10
          : null,
      sessionCount: agg?.sessionIds.size ?? 0,
    }
  })
}

// ── Exercise weekly history (grid) ────────────────────────────────────────────

export type ExerciseSetDetail = {
  setNumber: number
  weightKg: number | null
}

export type ExerciseDayData = {
  date: string
  dayLabel: string // e.g. "Lun 15/01"
  sets: ExerciseSetDetail[]
}

export type ExerciseWeekGrid = {
  weekNumber: number
  days: ExerciseDayData[]
  maxSets: number
}

export type ExerciseWeeklyHistory = {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  peakTopSetKg: number | null
  isBodyweight: boolean
  currentPlanWeek: number
  weeks: ExerciseWeekGrid[] // only current + past weeks that have data
}

const WEEK_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const name = WEEK_DAY_NAMES[d.getUTCDay()]
  const dd = dateStr.slice(8, 10)
  const mm = dateStr.slice(5, 7)
  return `${name} ${dd}/${mm}`
}

export async function getExerciseWeeklyHistory(
  clientId: string,
  exerciseId: string,
  activePlan: ActivePlanSummary
): Promise<ExerciseWeeklyHistory | null> {
  const supabase = await createClient()

  const { data: exerciseInfo } = await supabase
    .from('exercises')
    .select('id, name, muscle_group')
    .eq('id', exerciseId)
    .single()

  if (!exerciseInfo) return null

  const empty: ExerciseWeeklyHistory = {
    exerciseId,
    exerciseName: exerciseInfo.name,
    muscleGroup: exerciseInfo.muscle_group,
    peakTopSetKg: null,
    isBodyweight: true,
    currentPlanWeek: activePlan.currentWeek,
    weeks: [],
  }

  // Only fetch plan days up to and including the current week
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number')
    .eq('client_plan_id', activePlan.id)
    .lte('week_number', activePlan.currentWeek)

  if (!planDays || planDays.length === 0) return empty

  const planDayIds = planDays.map((d) => d.id)
  const weekByDayId = new Map(planDays.map((d) => [d.id, d.week_number]))

  const { data: pdes } = await supabase
    .from('client_plan_day_exercises')
    .select('id, client_plan_day_id')
    .in('client_plan_day_id', planDayIds)
    .eq('exercise_id', exerciseId)

  if (!pdes || pdes.length === 0) return empty

  const pdeIds = pdes.map((p) => p.id)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id, date')
    .eq('client_id', clientId)
    .in('client_plan_day_id', planDayIds)
    .eq('status', 'completed')

  if (!sessions || sessions.length === 0) return empty

  const sessionIds = sessions.map((s) => s.id)
  const dateBySessionId = new Map(sessions.map((s) => [s.id, s.date]))
  const planDayBySessionId = new Map(sessions.map((s) => [s.id, s.client_plan_day_id]))

  const { data: sets } = await supabase
    .from('session_sets')
    .select('session_id, client_plan_day_exercise_id, weight_kg, set_number')
    .in('session_id', sessionIds)
    .in('client_plan_day_exercise_id', pdeIds)
    .eq('completed', true)
    .order('set_number', { ascending: true })

  if (!sets || sets.length === 0) return empty

  // weekNumber → date → setNumber → weightKg
  const weekMap = new Map<number, Map<string, Map<number, number | null>>>()
  let peakTopSetKg: number | null = null

  for (const set of sets) {
    const date = dateBySessionId.get(set.session_id)
    const planDayId = planDayBySessionId.get(set.session_id)
    if (!date || !planDayId) continue
    const weekNumber = weekByDayId.get(planDayId) ?? 0
    if (weekNumber === 0) continue

    if (!weekMap.has(weekNumber)) weekMap.set(weekNumber, new Map())
    const dayMap = weekMap.get(weekNumber)!
    if (!dayMap.has(date)) dayMap.set(date, new Map())
    const setMap = dayMap.get(date)!

    const kg = set.weight_kg != null ? Number(set.weight_kg) : null
    // Keep existing value if already set for this set_number
    if (!setMap.has(set.set_number)) setMap.set(set.set_number, kg)

    if (kg !== null && (peakTopSetKg === null || kg > peakTopSetKg)) peakTopSetKg = kg
  }

  const weeks: ExerciseWeekGrid[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, dayMap]) => {
      const days: ExerciseDayData[] = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, setMap]) => {
          const maxSetNum = Math.max(...setMap.keys())
          const sets: ExerciseSetDetail[] = Array.from({ length: maxSetNum }, (_, i) => ({
            setNumber: i + 1,
            weightKg: setMap.get(i + 1) ?? null,
          }))
          return { date, dayLabel: formatDayLabel(date), sets }
        })
      const maxSets = days.reduce((m, d) => Math.max(m, d.sets.length), 0)
      return { weekNumber, days, maxSets }
    })

  return {
    exerciseId,
    exerciseName: exerciseInfo.name,
    muscleGroup: exerciseInfo.muscle_group,
    peakTopSetKg,
    isBodyweight: peakTopSetKg === null,
    currentPlanWeek: activePlan.currentWeek,
    weeks,
  }
}
