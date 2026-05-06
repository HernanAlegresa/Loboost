import { computeDayDate } from '@/features/clients/utils/training-utils'
import type { ClientStatus } from '@/features/clients/types/client-status'

/**
 * Determina el estado del cliente basado en sessionStatus por día pasado.
 * Prioridad: riesgo (missed) > naranja (in_progress) > al_dia.
 * El día actual (todayISO) se excluye — se le da ventana de 24h.
 */
export function computeClientStatus(
  activePlan: { id: string; start_date: string; weeks: number } | null,
  planDays: { id: string; week_number: number; day_of_week: number }[],
  sessionByDayId: Map<string, 'in_progress' | 'completed'>,
  todayISO: string
): ClientStatus {
  if (!activePlan) return 'sin_plan'

  const pastDays = planDays.filter(
    (d) => computeDayDate(activePlan.start_date, d.week_number, d.day_of_week) < todayISO
  )

  if (pastDays.length === 0) return 'al_dia'

  let hasNaranja = false
  for (const day of pastDays) {
    const sessionStatus = sessionByDayId.get(day.id) ?? null
    if (sessionStatus === null) return 'riesgo'
    if (sessionStatus === 'in_progress') hasNaranja = true
  }

  return hasNaranja ? 'naranja' : 'al_dia'
}
