import { createClient } from '@/lib/supabase/server'

export type PlanListRow = {
  id: string
  name: string
  weeks: number
  created_at: string
  trainingDays: number
}

export type ClientPick = {
  id: string
  full_name: string | null
}

export type ExercisePick = {
  id: string
  name: string
  type: 'strength' | 'cardio'
}

export async function getCoachPlans(coachId: string): Promise<PlanListRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, weeks, created_at, plan_days(id)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    weeks: p.weeks,
    created_at: p.created_at,
    trainingDays: (p.plan_days as { id: string }[] | null)?.length ?? 0,
  }))
}

export async function getCoachClientsForAssign(coachId: string): Promise<ClientPick[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_id', coachId)
    .eq('role', 'client')
    .order('full_name')

  if (error || !data) return []
  return data
}

export async function getCoachExercisesForPlanBuilder(coachId: string): Promise<ExercisePick[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, type')
    .eq('coach_id', coachId)
    .order('name')

  if (error || !data) return []
  return data as ExercisePick[]
}

export async function getPlanMetaForAssign(coachId: string, planId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, weeks')
    .eq('id', planId)
    .eq('coach_id', coachId)
    .single()

  if (error || !data) return null
  return data
}
