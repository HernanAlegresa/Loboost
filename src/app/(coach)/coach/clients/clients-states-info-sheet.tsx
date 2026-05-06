'use client'

/**
 * Panel de ayuda (ícono "i" en Clientes).
 *
 * Dónde ajustar layout / tamaño:
 * - `PANEL_WIDTH_PX` → ancho máximo del panel (px).
 * - `PANEL_VERTICAL_INSET_PX` → margen extra arriba/abajo respecto a safe-area (el panel queda centrado en el espacio útil).
 *
 * Posición: el panel se centra en pantalla (flex + align/justify center). La animación `x` lo trae desde la izquierda hasta ese centro.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

type RuleBlock = {
  label: string
  color: string
  description: string
}

const RULE_BLOCKS: RuleBlock[] = [
  { label: 'Sin plan',   color: '#6B7280', description: 'Sin plan activo asignado.' },
  { label: 'Al día',     color: '#22C55E', description: 'Todos los entrenamientos pasados completados.' },
  { label: 'Pendiente',  color: '#F2C94A', description: 'Algún entrenamiento pasado en progreso.' },
  { label: 'En riesgo',  color: '#F25252', description: 'Algún entrenamiento pasado sin registrar.' },
]

/** Ancho máximo del panel (centrado). Subí/bajá este valor para más angosto o ancho. */
const PANEL_WIDTH_PX = 300

/**
 * Suma este margen (×2) al calcular la altura útil: evita que el panel toque los bordes.
 * Si querés más aire arriba/abajo, subí el número (ej. 32).
 */
const PANEL_VERTICAL_INSET_PX = 28

/** Celeste del ícono “i” y botón cerrar (opaco) */
const PANEL_BORDER_CELESTE = '#56C5FA'

/** Mismo tono que el botón “i” en la pestaña Clientes (`clients-tabs-container`) */
const PANEL_HEADER_INFO_CELESTE = 'rgba(86, 197, 250, 0.72)'

/** Velo detrás del panel: más oscuro = el panel se lee mejor y no compite con el fondo */
const PANEL_BACKDROP_SCRIM = 'rgba(4, 5, 7, 0.78)'

/** Ancho reservado a cada lado del título (icono Info / botón cerrar) */
const HEADER_SIDE_SLOT_PX = 44

/** Hueco lateral: más grande acerca iconos “i” y X hacia el centro del panel */
const HEADER_SIDE_INSET_PX = 20

export default function ClientsStatesInfoSheet({ open, onClose }: Props) {
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
            key="clients-states-backdrop"
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

      {/* Capa centrada: AnimatePresence hijo directo = aside, para exit del slide */}
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
              key="clients-states-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clients-states-panel-heading"
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
                  alignItems: 'center',
                  padding: '12px 0',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: HEADER_SIDE_SLOT_PX,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingLeft: HEADER_SIDE_INSET_PX,
                    lineHeight: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Info size={20} strokeWidth={2.35} color={PANEL_HEADER_INFO_CELESTE} />
                </div>
                <h2
                  id="clients-states-panel-heading"
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
                  Estados de clientes
                </h2>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
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
                  gap: 10,
                }}
              >
                {RULE_BLOCKS.map((block, index) => (
                  <motion.div
                    key={block.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.04 + index * 0.04,
                      duration: 0.32,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 4px',
                      borderBottom: index < RULE_BLOCKS.length - 1
                        ? '1px solid rgba(255,255,255,0.05)'
                        : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: block.color,
                        flexShrink: 0,
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 13, color: '#D1D5DB', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: block.color }}>{block.label}:</span>{' '}
                      {block.description}
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

