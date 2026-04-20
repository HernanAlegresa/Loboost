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
