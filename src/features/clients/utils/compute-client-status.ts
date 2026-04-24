import { createClient } from '@/lib/supabase/server'
import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { ActivePlanSummary } from '@/features/clients/types'
import type { ClientStatus } from '@/features/clients/types/client-status'

export async function computeClientStatus(
  clientId: string,
  activePlan: ActivePlanSummary | null
): Promise<ClientStatus> {
  if (!activePlan) return 'sin-datos'

  const supabase = await createClient()
  const todayISO = new Date().toISOString().split('T')[0]

  // 1. Todos los días del plan (hasta la semana actual inclusive)
  const { data: planDays } = await supabase
    .from('client_plan_days')
    .select('id, week_number, day_of_week')
    .eq('client_plan_id', activePlan.id)
    .lte('week_number', activePlan.currentWeek)

  if (!planDays || planDays.length === 0) return 'sin-datos'

  // 2. Filtrar solo días pasados (fecha < hoy, excluye hoy)
  const pastDays = planDays
    .map((d) => ({
      ...d,
      dateISO: computeDayDate(activePlan.startDate, d.week_number, d.day_of_week),
    }))
    .filter((d) => d.dateISO < todayISO)

  if (pastDays.length === 0) return 'sin-datos'

  const pastDayIds = pastDays.map((d) => d.id)

  // 3. Series planificadas por día (SUM de client_plan_day_exercises.sets por day)
  const { data: planExercises } = await supabase
    .from('client_plan_day_exercises')
    .select('client_plan_day_id, sets')
    .in('client_plan_day_id', pastDayIds)

  const plannedSetsByDayId = new Map<string, number>()
  for (const ex of planExercises ?? []) {
    plannedSetsByDayId.set(
      ex.client_plan_day_id,
      (plannedSetsByDayId.get(ex.client_plan_day_id) ?? 0) + ex.sets
    )
  }

  // 4. Sesiones del cliente para esos días
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_plan_day_id')
    .eq('client_id', clientId)
    .in('client_plan_day_id', pastDayIds)

  const sessionByDayId = new Map(
    (sessions ?? []).map((s) => [s.client_plan_day_id, s])
  )

  const sessionIds = (sessions ?? []).map((s) => s.id)

  // 5. Series completadas por sesión
  const completedSetsBySessionId = new Map<string, number>()
  if (sessionIds.length > 0) {
    const { data: completedSets } = await supabase
      .from('session_sets')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('completed', true)

    for (const s of completedSets ?? []) {
      completedSetsBySessionId.set(
        s.session_id,
        (completedSetsBySessionId.get(s.session_id) ?? 0) + 1
      )
    }
  }

  // 6. Sin ninguna serie completada en total → sin-datos
  const totalCompleted = Array.from(completedSetsBySessionId.values()).reduce(
    (a, b) => a + b,
    0
  )
  if (totalCompleted === 0) return 'sin-datos'

  // 7. Clasificar días incompletos
  let hasRiskyDay = false
  let hasAttentionDay = false

  for (const day of pastDays) {
    const session = sessionByDayId.get(day.id)
    const planned = plannedSetsByDayId.get(day.id) ?? 0
    const completed = session
      ? (completedSetsBySessionId.get(session.id) ?? 0)
      : 0
    const isDayComplete = planned > 0 && completed >= planned

    if (!isDayComplete) {
      if (day.week_number < activePlan.currentWeek) {
        hasRiskyDay = true
      } else {
        hasAttentionDay = true
      }
    }
  }

  if (hasRiskyDay) return 'riesgo'
  if (hasAttentionDay) return 'atencion'
  return 'al-dia'
}
