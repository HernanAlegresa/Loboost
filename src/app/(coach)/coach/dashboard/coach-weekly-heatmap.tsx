'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import type { CoachWeeklyHeatmap, WeeklyHeatmapCell } from './weekly-heatmap-types'
import CoachWeeklyHeatmapInfoSheet from './coach-weekly-heatmap-info-sheet'
import HeatmapCellDot from './heatmap-cell-dot'
import { hmPx } from './heatmap-layout'

type Props = {
  data: CoachWeeklyHeatmap
  /** Padding inferior del área con scroll (FAB + nav). */
  bottomPadding: number | string
}

const ROW_DIVIDER = '#1F2227'
/** Línea bajo la fila de fechas (mapa semanal). */
const HEADER_RULE = '#FFFFFF'
/** Fondo del mapa y de la fila sticky (misma capa que la app, sin bloque gris). */
const MAP_SURFACE = '#0A0A0A'

const GRID_COLS = `minmax(${hmPx(88)}px, 1fr) repeat(7, ${hmPx(24)}px)`
const GRID_GAP = hmPx(6)

/** Aire vertical entre filas de clientes (más = más separación). */
const ROW_PAD_Y = hmPx(20)

/**
 * Ajuste manual (px) al padding inferior del contenido con scroll, **sumado** al `bottomPadding` del FAB.
 *
 * - **Negativo** → menos hueco bajo la última fila → al llegar al tope del scroll el **último cliente baja** en pantalla.
 * - **Positivo** → más hueco → el último cliente queda **más arriba** al tope.
 *
 * Probá de a 8–16px hasta que cierre a ojo.
 */
const HEATMAP_SCROLL_LAST_ROW_BOTTOM_ADJUST_PX = -55

/** Mínimo de reserva bajo la última fila (FAB / barra) aunque el ajuste sea muy negativo. */
const HEATMAP_SCROLL_PADDING_BOTTOM_MIN_PX = 30

function scrollContentPaddingBottom(base: number | string): string {
  if (typeof base === 'number') {
    const n = Math.max(
      HEATMAP_SCROLL_PADDING_BOTTOM_MIN_PX,
      base + HEATMAP_SCROLL_LAST_ROW_BOTTOM_ADJUST_PX
    )
    return `${n}px`
  }
  return String(base)
}

/** Mismo celeste que el botón “i” en Clientes (`clients-tabs-container`). */
const HEATMAP_INFO_ICON_CELESTE = 'rgba(86, 197, 250, 0.72)'
const TODAY_HEADER_LIME = '#B5F23D'

export default function CoachWeeklyHeatmap({ data, bottomPadding }: Props) {
  const { dayShortLabels, rows, todayColumnIndex } = data
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: MAP_SURFACE,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '0 20px 6px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          aria-label="Información del mapa de esta semana"
          onClick={() => setInfoOpen(true)}
          style={{
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: HEATMAP_INFO_ICON_CELESTE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px 6px 0',
            lineHeight: 1.2,
            transition: 'opacity 160ms ease, transform 140ms ease',
          }}
        >
          <Info size={hmPx(20)} strokeWidth={2.35} aria-hidden color={HEATMAP_INFO_ICON_CELESTE} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: '24px 20px',
              paddingBottom: scrollContentPaddingBottom(bottomPadding),
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF', lineHeight: 1.5 }}>
              No tenés clientes con plan activo. Asigná un plan para ver el mapa semanal.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: `0 20px ${scrollContentPaddingBottom(bottomPadding)}`,
            }}
          >
            <div style={{ backgroundColor: 'transparent', maxWidth: '100%' }}>
              <div style={{ minWidth: hmPx(320), padding: `0 ${hmPx(10)}px ${hmPx(14)}px` }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    columnGap: GRID_GAP,
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    marginLeft: -hmPx(10),
                    marginRight: -hmPx(10),
                    paddingLeft: hmPx(10),
                    paddingRight: hmPx(10),
                    paddingTop: hmPx(6),
                    paddingBottom: hmPx(8),
                    backgroundColor: MAP_SURFACE,
                    borderBottom: `1px solid ${HEADER_RULE}`,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      fontSize: hmPx(8),
                      color: '#B5F23D',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                    }}
                  >
                    ESTA SEMANA
                  </span>
                  {dayShortLabels.map((label, colIndex) => {
                    const isTodayCol = colIndex === todayColumnIndex
                    return (
                      <span
                        key={label}
                        style={{
                          fontSize: hmPx(9),
                          fontWeight: isTodayCol ? 800 : 700,
                          color: isTodayCol ? TODAY_HEADER_LIME : '#6B7280',
                          textAlign: 'center',
                          lineHeight: 1.15,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {label.replace(' ', '\n')}
                      </span>
                    )
                  })}
                </div>

                {rows.map((row, rowIndex) => (
                  <div
                    key={row.clientId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      columnGap: GRID_GAP,
                      alignItems: 'center',
                      paddingTop: ROW_PAD_Y,
                      paddingBottom: ROW_PAD_Y,
                      borderBottom:
                        rowIndex < rows.length - 1 ? `1px solid ${ROW_DIVIDER}` : 'none',
                    }}
                  >
                    <Link
                      href={`/coach/clients/${row.clientId}`}
                      style={{
                        fontSize: hmPx(12),
                        fontWeight: 600,
                        color: '#E5E7EB',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingRight: hmPx(4),
                        alignSelf: 'center',
                      }}
                    >
                      {row.fullName}
                    </Link>
                    {row.cells.map((cell, i) => (
                      <div key={`${row.clientId}-${i}`} style={{ display: 'flex', justifyContent: 'center' }}>
                        <HeatmapCellDot cell={cell} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <CoachWeeklyHeatmapInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}
