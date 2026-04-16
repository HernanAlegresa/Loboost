'use client'

import type { WeeklyHeatmapCell, WeeklyHeatmapCellKind } from './weekly-heatmap-types'
import { hmPx } from './heatmap-layout'

const CELL_BG: Record<WeeklyHeatmapCellKind, string> = {
  rest: 'transparent',
  completed: 'rgba(34, 197, 94, 0.38)',
  in_progress: 'rgba(234, 179, 8, 0.32)',
  missed: 'rgba(242, 82, 82, 0.28)',
  /** Pendiente / futuro — plateado (más claro). */
  upcoming: 'rgba(229, 231, 235, 0.32)',
}

const CELL_BORDER: Record<WeeklyHeatmapCellKind, string> = {
  rest: 'transparent',
  completed: 'rgba(34, 197, 94, 0.85)',
  in_progress: 'rgba(234, 179, 8, 0.9)',
  missed: 'rgba(242, 82, 82, 0.85)',
  upcoming: 'rgba(229, 231, 235, 0.78)',
}

const TODAY_RING = '#B5F23D'

const DOT_SIZE = hmPx(24)
const DOT_RADIUS = 9999
/** Anillo lima “hoy”: 1px para que no compita con el borde de la celda. */
const TODAY_RING_PX = 1

type Props = {
  cell: WeeklyHeatmapCell
  /**
   * Leyenda del panel “i”: fila “Hoy” con interior negro (el mapa sigue usando plateado upcoming).
   */
  panelTodayLegend?: boolean
}

/** Cuadrado del mapa (misma apariencia en dashboard y panel de leyenda). */
export default function HeatmapCellDot({ cell, panelTodayLegend }: Props) {
  const useBlackTodayLegendFill =
    !!panelTodayLegend && cell.kind === 'upcoming' && cell.isToday

  if (cell.kind === 'rest') {
    const restXColor = cell.isToday ? TODAY_RING : '#6B7280'
    return (
      <div
        title={cell.isToday ? 'Descanso · hoy' : 'Descanso'}
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_RADIUS,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: hmPx(14),
            height: hmPx(2),
            backgroundColor: restXColor,
            borderRadius: 9999,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: hmPx(14),
            height: hmPx(2),
            backgroundColor: restXColor,
            borderRadius: 9999,
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            opacity: 0.9,
          }}
        />
      </div>
    )
  }

  const backgroundColor = useBlackTodayLegendFill ? '#0A0A0A' : CELL_BG[cell.kind]
  const borderColor = useBlackTodayLegendFill ? '#1F2227' : CELL_BORDER[cell.kind]

  return (
    <div
      title={`${cell.kind}${cell.isToday ? ' · hoy' : ''}`}
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_RADIUS,
        flexShrink: 0,
        backgroundColor,
        border: cell.isToday ? `1px solid ${borderColor}` : 'none',
        boxSizing: 'border-box',
        ...(cell.isToday ? { boxShadow: `0 0 0 ${TODAY_RING_PX}px ${TODAY_RING}` } : {}),
      }}
    />
  )
}
