'use client'

/**
 * Panel de ayuda del mapa semanal (ícono “i” en el dashboard).
 * Mismo patrón visual que `clients-states-info-sheet.tsx`.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'
import type { WeeklyHeatmapCell } from './weekly-heatmap-types'
import HeatmapCellDot from './heatmap-cell-dot'

type Props = {
  open: boolean
  onClose: () => void
}

type LegendRow = { key: string; cell: WeeklyHeatmapCell; label: string }

/** Mismos cuadrados que el mapa + una línea de texto. */
const LEGEND_ROWS: LegendRow[] = [
  { key: 'done', cell: { kind: 'completed', isToday: false }, label: 'Completado y registrado.' },
  { key: 'prog', cell: { kind: 'in_progress', isToday: false }, label: 'En curso: falta cerrar la sesión.' },
  { key: 'miss', cell: { kind: 'missed', isToday: false }, label: 'Día pasado sin registro.' },
  { key: 'pend', cell: { kind: 'upcoming', isToday: false }, label: 'Pendiente o futuro.' },
  { key: 'rest', cell: { kind: 'rest', isToday: false }, label: 'Sin entreno planificado ese día.' },
  { key: 'today', cell: { kind: 'upcoming', isToday: true }, label: 'Hoy (borde lima).' },
]

const PANEL_WIDTH_PX = 300
const PANEL_VERTICAL_INSET_PX = 28
const PANEL_BORDER_CELESTE = '#56C5FA'
const PANEL_HEADER_INFO_CELESTE = 'rgba(86, 197, 250, 0.72)'
const PANEL_BORDER_CELESTE_TRANSPARENT = 'rgba(86, 197, 250, 0.48)'
const PANEL_BACKDROP_SCRIM = 'rgba(4, 5, 7, 0.78)'
const HEADER_SIDE_SLOT_PX = 44
const HEADER_SIDE_INSET_PX = 20

export default function CoachWeeklyHeatmapInfoSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const panelMaxHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${PANEL_VERTICAL_INSET_PX * 2}px)`

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="heatmap-weekly-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 180,
              backgroundColor: PANEL_BACKDROP_SCRIM,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
        ) : null}
      </AnimatePresence>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 181,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {open ? (
            <motion.aside
              key="heatmap-weekly-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="heatmap-week-map-heading"
              initial={{ x: '-120vw', opacity: 0.96 }}
              animate={{
                x: 0,
                opacity: 1,
                transition: {
                  x: { type: 'spring', damping: 34, stiffness: 380, mass: 0.82 },
                  opacity: { duration: 0.22 },
                },
              }}
              exit={{
                x: '-120vw',
                opacity: 0.96,
                transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                width: `min(${PANEL_WIDTH_PX}px, 100%)`,
                maxWidth: PANEL_WIDTH_PX,
                maxHeight: panelMaxHeight,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(165deg, #14181E 0%, #101216 55%, #0C0E11 100%)',
                border: `0.5px solid ${PANEL_BORDER_CELESTE_TRANSPARENT}`,
                borderRadius: 18,
                boxShadow:
                  '0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'grid',
                  gridTemplateColumns: `${HEADER_SIDE_SLOT_PX}px 1fr ${HEADER_SIDE_SLOT_PX}px`,
                  alignItems: 'flex-start',
                  padding: '12px 0 8px 0',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: HEADER_SIDE_SLOT_PX,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    paddingLeft: HEADER_SIDE_INSET_PX,
                    paddingTop: 2,
                    lineHeight: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Info size={20} strokeWidth={2.35} color={PANEL_HEADER_INFO_CELESTE} />
                </div>
                <h2
                  id="heatmap-week-map-heading"
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#F0F0F0',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                    textAlign: 'center',
                    justifySelf: 'stretch',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textShadow: 'none',
                  }}
                >
                  Mapa de esta semana
                </h2>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    paddingTop: 2,
                    paddingRight: HEADER_SIDE_INSET_PX,
                    boxSizing: 'border-box',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={onClose}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 8,
                      margin: -8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: PANEL_BORDER_CELESTE,
                      lineHeight: 0,
                      transition: 'opacity 160ms ease, transform 120ms ease',
                    }}
                  >
                    <X size={22} strokeWidth={2.35} aria-hidden color={PANEL_BORDER_CELESTE} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorY: 'contain',
                  paddingLeft: 16,
                  paddingRight: 14,
                  paddingBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {LEGEND_ROWS.map((row, index) => (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.02 + index * 0.02,
                      duration: 0.2,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom:
                        index < LEGEND_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <HeatmapCellDot cell={row.cell} panelTodayLegend={row.key === 'today'} />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#D1D5DB',
                        lineHeight: 1.4,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {row.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  )
}
