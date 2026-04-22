import { createClient } from '@/lib/supabase/server'

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
