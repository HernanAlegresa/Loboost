import { createClient } from '@/lib/supabase/server'
import {
  getCurrentWeek,
  computeDayDate,
} from '@/features/clients/utils/training-utils'
import type {
  ClientDashboardData,
  ClientActivePlan,
  TodayDayData,
  TodayExercise,
} from '@/features/training/types'

export async function getClientDashboardData(
  clientId: string
): Promise<ClientDashboardData> {
  const supabase = await createClient()

  const [profileResult, planResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_plans')
      .select('id, name, weeks, start_date, end_date, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const fullName = profileResult.data?.full_name ?? 'Cliente'
  const plan = planResult.data

  if (!plan) {
    return { fullName, activePlan: null, today: null }
  }

  const currentWeek = getCurrentWeek(plan.start_date, plan.weeks)
  const todayISO = new Date().toISOString().split('T')[0]
  const progressPct = Math.max(8, Math.round(((currentWeek - 1) / plan.weeks) * 100))

  const activePlan: ClientActivePlan = {
    id: plan.id,
    name: plan.name,
    weeks: plan.weeks,
    currentWeek,
    startDate: plan.start_date,
    endDate: plan.end_date,
    progressPct,
  }

  // Get plan days for current week to find today
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, day_of_week')
    .eq('client_plan_id', plan.id)
    .eq('week_number', currentWeek)

  if (!planDays || planDays.length === 0) {
    return { fullName, activePlan, today: null }
  }

  const todayPlanDay = planDays.find(
    (d) => computeDayDate(plan.start_date, currentWeek, d.day_of_week) === todayISO
  )

  if (!todayPlanDay) {
    return { fullName, activePlan, today: null }
  }

  // Load exercises + existing session for today in parallel
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

  const exercises: TodayExercise[] = (exercisesResult.data ?? []).map((ex) => ({
    clientPlanDayExerciseId: ex.id,
    name: (ex.exercises as { name: string } | null)?.name ?? 'Ejercicio',
    order: ex.order,
    plannedSets: ex.sets,
    plannedReps: ex.reps ?? null,
    plannedDurationSeconds: ex.duration_seconds ?? null,
  }))

  const today: TodayDayData = {
    clientPlanDayId: todayPlanDay.id,
    dayOfWeek: todayPlanDay.day_of_week,
    exercises,
    existingSessionId: sessionResult.data?.id ?? null,
    sessionStatus:
      (sessionResult.data?.status as 'in_progress' | 'completed' | null) ?? null,
  }

  return { fullName, activePlan, today }
}
