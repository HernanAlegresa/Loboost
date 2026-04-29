import { createClient } from '@/lib/supabase/server'
import { computeDayDate, computeDayStatus, getCurrentWeek, getTodayISO } from '@/features/clients/utils/training-utils'
import type { DayStatus } from '@/features/clients/types'

export type ClientSessionListItem = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  rpe: number | null
  notes: string | null
  dayOfWeek: number
  weekNumber: number
  exerciseCount: number
  completedSets: number
}

type SessionTimelineStatus = Exclude<DayStatus, 'rest'>

export type SessionTimelineDay = {
  id: string
  dayOfWeek: number
  date: string
  status: SessionTimelineStatus
  sessionId: string | null
  exerciseCount: number
  completedSets: number
}

export type SessionTimelineWeek = {
  weekNumber: number
  phase: 'past' | 'current' | 'future'
  completedSessions: number
  totalSessions: number
  days: SessionTimelineDay[]
}

export type CoachSessionsTimeline = {
  hasPlan: boolean
  weeks: SessionTimelineWeek[]
}

type RawSession = {
  id: string
  date: string
  status: 'completed' | 'in_progress'
  notes: string | null
  rpe: number | null
  client_plan_day_id: string | null
}

function pickPreferredSession(candidates: RawSession[]): RawSession {
  return candidates.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'completed' ? -1 : 1
    }
    return b.date.localeCompare(a.date)
  })[0]!
}

function mapPhase(weekNumber: number, currentWeek: number, planEnded: boolean): 'past' | 'current' | 'future' {
  if (planEnded) return 'past'
  if (weekNumber < currentWeek) return 'past'
  if (weekNumber > currentWeek) return 'future'
  return 'current'
}

export async function getCoachSessionsTimeline(
  clientId: string,
  coachId: string
): Promise<CoachSessionsTimeline | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()

  if (!profile || profile.coach_id !== coachId) return null

  const { data: activePlan } = await supabase
    .from('client_plans')
    .select('id, weeks, start_date, end_date')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!activePlan) {
    return { hasPlan: false, weeks: [] }
  }

  const { data: planDays, error: planDaysError } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week, order')
    .eq('client_plan_id', activePlan.id)
    .order('week_number', { ascending: true })
    .order('order', { ascending: true })

  if (planDaysError) return { hasPlan: true, weeks: [] }

  const planDayIds = (planDays ?? []).map((day) => day.id)

  let sessions: RawSession[] = []
  if (planDayIds.length > 0) {
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, date, status, notes, rpe, client_plan_day_id')
      .eq('client_id', clientId)
      .in('client_plan_day_id', planDayIds)
      .in('status', ['completed', 'in_progress'])

    if (sessionsError) return { hasPlan: true, weeks: [] }
    sessions = (sessionsData as RawSession[] | null) ?? []
  }

  const sessionIds = sessions.map((session) => session.id)
  let setsData: Array<{ session_id: string; completed: boolean; client_plan_day_exercise_id: string }> = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select('session_id, completed, client_plan_day_exercise_id')
      .in('session_id', sessionIds)

    setsData = data ?? []
  }

  const setsBySession = new Map<string, typeof setsData>()
  for (const set of setsData) {
    if (!setsBySession.has(set.session_id)) setsBySession.set(set.session_id, [])
    setsBySession.get(set.session_id)!.push(set)
  }

  const sessionsByPlanDay = new Map<string, RawSession[]>()
  for (const session of sessions) {
    if (!session.client_plan_day_id) continue
    if (!sessionsByPlanDay.has(session.client_plan_day_id)) sessionsByPlanDay.set(session.client_plan_day_id, [])
    sessionsByPlanDay.get(session.client_plan_day_id)!.push(session)
  }

  const todayISO = getTodayISO()
  const planEnded = activePlan.end_date < todayISO
  const currentWeek = getCurrentWeek(activePlan.start_date, activePlan.weeks)
  const planDaysByWeek = new Map<number, typeof planDays>()
  for (const day of planDays ?? []) {
    if (!planDaysByWeek.has(day.week_number)) planDaysByWeek.set(day.week_number, [])
    planDaysByWeek.get(day.week_number)!.push(day)
  }

  const weeks: SessionTimelineWeek[] = Array.from({ length: activePlan.weeks }, (_, index) => {
    const weekNumber = index + 1
    const weekPlanDays = (planDaysByWeek.get(weekNumber) ?? []).sort((a, b) => a.day_of_week - b.day_of_week)

    const days: SessionTimelineDay[] = weekPlanDays.map((day) => {
      const date = computeDayDate(activePlan.start_date, weekNumber, day.day_of_week)
      const candidates = sessionsByPlanDay.get(day.id) ?? []
      const selectedSession = candidates.length > 0 ? pickPreferredSession(candidates) : null
      const sessionStatus = selectedSession?.status ?? null
      const status: SessionTimelineStatus = selectedSession
        ? selectedSession.status
        : (computeDayStatus(date, todayISO, sessionStatus) as SessionTimelineStatus)

      const sets = selectedSession ? (setsBySession.get(selectedSession.id) ?? []) : []
      const exerciseCount = new Set(sets.map((set) => set.client_plan_day_exercise_id)).size
      const completedSets = sets.filter((set) => set.completed).length

      return {
        id: day.id,
        dayOfWeek: day.day_of_week,
        date,
        status,
        sessionId: selectedSession?.id ?? null,
        exerciseCount,
        completedSets,
      }
    })

    return {
      weekNumber,
      phase: mapPhase(weekNumber, currentWeek, planEnded),
      completedSessions: days.filter((day) => day.status === 'completed').length,
      totalSessions: days.length,
      days,
    }
  })

  return { hasPlan: true, weeks }
}

export async function getClientSessionsForCoach(
  clientId: string,
  coachId: string
): Promise<ClientSessionListItem[] | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', clientId)
    .single()

  if (!profile || profile.coach_id !== coachId) return null

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id, date, status, rpe, notes,
      client_plan_days ( day_of_week, week_number )
    `)
    .eq('client_id', clientId)
    .in('status', ['completed', 'in_progress'])
    .order('date', { ascending: false })
    .limit(60)

  if (error || !sessions) return []

  const sessionIds = sessions.map((s) => s.id)
  let setsData: Array<{ session_id: string; completed: boolean; client_plan_day_exercise_id: string }> = []

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_sets')
      .select('session_id, completed, client_plan_day_exercise_id')
      .in('session_id', sessionIds)
    setsData = data ?? []
  }

  const setsBySession = new Map<string, typeof setsData>()
  for (const s of setsData) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, [])
    setsBySession.get(s.session_id)!.push(s)
  }

  type RawSession = typeof sessions[number]
  type RawDay = { day_of_week: number; week_number: number } | null

  return sessions.map((sess: RawSession) => {
    const day = sess.client_plan_days as RawDay
    const sets = setsBySession.get(sess.id) ?? []
    const exerciseIds = new Set(sets.map((s) => s.client_plan_day_exercise_id))
    return {
      id: sess.id,
      date: sess.date,
      status: sess.status as 'completed' | 'in_progress',
      rpe: sess.rpe,
      notes: sess.notes,
      dayOfWeek: day?.day_of_week ?? 0,
      weekNumber: day?.week_number ?? 0,
      exerciseCount: exerciseIds.size,
      completedSets: sets.filter((s) => s.completed).length,
    }
  })
}
