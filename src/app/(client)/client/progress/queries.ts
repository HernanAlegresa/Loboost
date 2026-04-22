import { createClient } from '@/lib/supabase/server'
import type { ExercisePR, ClientProgressData } from '@/features/training/types'

export async function getClientProgressData(clientId: string): Promise<ClientProgressData> {
  const supabase = await createClient()

  const { data: setRows } = await supabase
    .from('session_sets')
    .select(`
      weight_kg,
      reps_performed,
      logged_at,
      sessions!inner (
        id, client_id, status
      ),
      client_plan_day_exercises!inner (
        exercise_id,
        exercises!inner (
          id, name, muscle_group
        )
      )
    `)
    .eq('completed', true)
    .eq('sessions.client_id', clientId)
    .eq('sessions.status', 'completed')
    .order('weight_kg', { ascending: false })

  type SetRow = {
    weight_kg: number | null
    reps_performed: number | null
    logged_at: string | null
    sessions: { id: string; client_id: string; status: string } | null
    client_plan_day_exercises: {
      exercise_id: string
      exercises: { id: string; name: string; muscle_group: string } | null
    } | null
  }

  const prMap = new Map<string, ExercisePR>()
  for (const row of (setRows as SetRow[]) ?? []) {
    const ex = row.client_plan_day_exercises?.exercises
    if (!ex) continue
    const existing = prMap.get(ex.id)
    const bestWeight = row.weight_kg ?? 0
    if (!existing || (row.weight_kg != null && bestWeight > (existing.bestWeightKg ?? 0))) {
      prMap.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscle_group,
        bestWeightKg: row.weight_kg,
        bestRepsAtBestWeight: row.reps_performed,
        totalCompletedSets: (existing?.totalCompletedSets ?? 0) + 1,
        lastLoggedAt: row.logged_at,
      })
    } else if (existing) {
      existing.totalCompletedSets += 1
    }
  }

  const { data: bodyRows } = await supabase
    .from('body_measurements')
    .select('date, weight_kg')
    .eq('client_id', clientId)
    .order('date', { ascending: true })

  return {
    prs: Array.from(prMap.values()).sort((a, b) => (b.bestWeightKg ?? 0) - (a.bestWeightKg ?? 0)),
    bodyMeasurements: (bodyRows ?? [])
      .filter((r) => r.weight_kg != null)
      .map((r) => ({ date: r.date, weightKg: r.weight_kg as number })),
  }
}

// ── Progress series types ──────────────────────────────────────────────────

export type ExerciseWeeklyMax = {
  weekLabel: string
  maxWeightKg: number
}

export type ExerciseProgressSeries = {
  exerciseId: string
  exerciseName: string
  series: ExerciseWeeklyMax[]
  currentMax: number | null
}

export type BodyWeightPoint = {
  dateLabel: string
  weightKg: number
}

export type ClientProgressStats = {
  totalSessions: number
  currentStreak: number
  longestStreak: number
}

export async function getExerciseProgressSeries(
  clientId: string
): Promise<ExerciseProgressSeries[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('session_sets')
    .select(`
      weight_kg,
      sessions!inner (
        client_id,
        client_plan_days!inner (
          week_number
        )
      ),
      client_plan_day_exercises!inner (
        exercises!inner ( id, name )
      )
    `)
    .eq('sessions.client_id', clientId)
    .eq('completed', true)
    .not('weight_kg', 'is', null)

  if (error || !data) return []

  type Row = {
    weight_kg: number
    sessions: {
      client_plan_days: {
        week_number: number
      }
    }
    client_plan_day_exercises: {
      exercises: { id: string; name: string } | null
    }
  }

  const byExercise = new Map<string, { name: string; byWeek: Map<number, number> }>()

  for (const row of data as Row[]) {
    const ex = row.client_plan_day_exercises.exercises
    if (!ex) continue
    const weekNum = row.sessions.client_plan_days.week_number
    const weight = row.weight_kg

    if (!byExercise.has(ex.id)) {
      byExercise.set(ex.id, { name: ex.name, byWeek: new Map() })
    }
    const entry = byExercise.get(ex.id)!
    const current = entry.byWeek.get(weekNum) ?? 0
    if (weight > current) entry.byWeek.set(weekNum, weight)
  }

  const result: ExerciseProgressSeries[] = []

  for (const [exerciseId, { name, byWeek }] of byExercise.entries()) {
    const sortedWeeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0])
    const series: ExerciseWeeklyMax[] = sortedWeeks.map(([weekNum, maxW]) => ({
      weekLabel: `Sem ${weekNum}`,
      maxWeightKg: maxW,
    }))
    const currentMax = series.length > 0 ? series[series.length - 1].maxWeightKg : null
    result.push({ exerciseId, exerciseName: name, series, currentMax })
  }

  result.sort((a, b) => (b.currentMax ?? 0) - (a.currentMax ?? 0))
  return result
}

export async function getBodyWeightSeries(clientId: string): Promise<BodyWeightPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('body_measurements')
    .select('date, weight_kg')
    .eq('client_id', clientId)
    .order('date', { ascending: true })
    .limit(52)

  if (error || !data) return []

  return data.map((m) => ({
    dateLabel: new Date(m.date + 'T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short',
    }),
    weightKg: Number(m.weight_kg),
  }))
}

export async function getClientProgressStats(clientId: string): Promise<ClientProgressStats> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('completed_at')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  function getWeekKey(isoDateOrTs: string): string {
    const d = new Date(isoDateOrTs)
    const day = d.getDay()
    const diff = (day + 6) % 7
    d.setDate(d.getDate() - diff)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  const weeks = new Set((sessions ?? []).map((s) => getWeekKey(s.completed_at!)))

  let streak = 0
  const checkDate = new Date()
  while (true) {
    const key = getWeekKey(checkDate.toISOString())
    if (!weeks.has(key)) break
    streak++
    checkDate.setDate(checkDate.getDate() - 7)
  }

  return {
    totalSessions: count ?? 0,
    currentStreak: streak,
    longestStreak: streak,
  }
}
