/** Celda del mapa semanal (lunes–domingo calendario actual). */
export type WeeklyHeatmapCellKind =
  | 'rest'
  | 'completed'
  | 'in_progress'
  | 'missed'
  | 'upcoming'

export type WeeklyHeatmapCell = {
  kind: WeeklyHeatmapCellKind
  isToday: boolean
}

export type WeeklyHeatmapRow = {
  clientId: string
  fullName: string
  cells: WeeklyHeatmapCell[]
}

export type CoachWeeklyHeatmap = {
  weekMondayISO: string
  /** Índice 0–6 (lun–dom) de la columna del día de hoy. */
  todayColumnIndex: number
  dayShortLabels: string[]
  rows: WeeklyHeatmapRow[]
}
