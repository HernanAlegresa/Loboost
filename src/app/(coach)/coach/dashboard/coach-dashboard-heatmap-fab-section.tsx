'use client'

/**
 * Mapa semanal + FAB en columna: el mapa solo ocupa su alto (hasta un tope) y la franja
 * inferior crece con `flex: 1`, con el FAB centrado en ese espacio (mismo aire arriba y abajo
 * respecto al mapa y a la bottom nav).
 */

import CoachWeeklyHeatmap from './coach-weekly-heatmap'
import Fab from './fab'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import type { CoachWeeklyHeatmap as CoachWeeklyHeatmapData } from './weekly-heatmap-types'

const LIST_TOP_MARGIN_PX = 16

/** Mismo criterio que `fab.tsx`: botón + respiro arriba y abajo dentro de la franja. */
const FAB_SLOT_MIN_PX = 56 + 22 + 22

type Props = {
  weeklyHeatmap: CoachWeeklyHeatmapData
}

export default function CoachDashboardHeatmapFabSection({ weeklyHeatmap }: Props) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: LIST_TOP_MARGIN_PX,
        backgroundColor: '#0A0A0A',
      }}
    >
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          maxHeight: `calc(100% - ${FAB_SLOT_MIN_PX}px)`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CoachWeeklyHeatmap
          data={weeklyHeatmap}
          bottomPadding={24}
        />
      </div>
      <div
        style={{
          flex: '1 1 0',
          minHeight: FAB_SLOT_MIN_PX,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: SAFE_BOTTOM_NAV_HEIGHT,
        }}
      >
        <Fab dock="inline" />
      </div>
    </div>
  )
}
