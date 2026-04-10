import { createClient } from '@/lib/supabase/server'
import type { SessionHistoryItem } from '@/features/training/types'

export async function getSessionHistory(
  clientId: string
): Promise<SessionHistoryItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sessions')
    .select(
      `id, date, status, completed_at,
       client_plan_days(
         day_of_week,
         client_plans(name)
       )`
    )
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(50)

  type Row = {
    id: string
    date: string
    status: string
    completed_at: string | null
    client_plan_days: {
      day_of_week: number
      client_plans: { name: string } | null
    } | null
  }

  return ((data as Row[]) ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status as 'in_progress' | 'completed',
    completedAt: s.completed_at,
    planName: s.client_plan_days?.client_plans?.name ?? 'Entrenamiento',
    dayOfWeek: s.client_plan_days?.day_of_week ?? 0,
  }))
}
