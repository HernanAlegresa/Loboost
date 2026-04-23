'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

type LegendRow = {
  key: string
  bg: string
  border: string
  shadow?: string
  isRest?: boolean
  label: string
}

const LEGEND_ROWS: LegendRow[] = [
  {
    key: 'completed',
    bg: 'rgba(181, 242, 61, 0.35)',
    border: '1px solid rgba(181, 242, 61, 0.85)',
    label: 'Sesión completada.',
  },
  {
    key: 'in_progress',
    bg: 'rgba(242, 153, 74, 0.32)',
    border: '1px solid rgba(242, 153, 74, 0.9)',
    label: 'Sesión en progreso.',
  },
  {
    key: 'today',
    bg: 'rgba(181, 242, 61, 0.12)',
    border: '1px solid rgba(181, 242, 61, 0.85)',
    shadow: '0 0 0 1px #B5F23D',
    label: 'Hoy — sesión pendiente.',
  },
  {
    key: 'past_missed',
    bg: 'rgba(245, 158, 11, 0.28)',
    border: '1px solid rgba(245, 158, 11, 0.8)',
    label: 'Día pasado sin completar. Podés registrarlo.',
  },
  {
    key: 'rest',
    bg: 'transparent',
    border: 'none',
    isRest: true,
    label: 'Día de descanso.',
  },
  {
    key: 'upcoming',
    bg: 'rgba(229, 231, 235, 0.12)',
    border: '1px solid rgba(229, 231, 235, 0.3)',
    label: 'Día futuro.',
  },
]

const INFO_CELESTE = 'rgba(86, 197, 250, 0.72)'
const BORDER_CELESTE_T = 'rgba(86, 197, 250, 0.48)'
const BACKDROP = 'rgba(4, 5, 7, 0.78)'

function LegendDot({ row }: { row: LegendRow }) {
  if (row.isRest) {
    return (
      <div style={{ width: 24, height: 24, position: 'relative', flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 12, height: 2, backgroundColor: '#4B5563', borderRadius: 9999,
          transform: 'translate(-50%, -50%) rotate(45deg)',
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 12, height: 2, backgroundColor: '#4B5563', borderRadius: 9999,
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        }} />
      </div>
    )
  }
  return (
    <div style={{
      width: 24,
      height: 24,
      borderRadius: 9999,
      flexShrink: 0,
      boxSizing: 'border-box',
      backgroundColor: row.bg,
      border: row.border,
      ...(row.shadow ? { boxShadow: row.shadow } : {}),
    }} />
  )
}

export default function ClientWeekHeatmapInfoSheet({ open, onClose }: Props) {
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

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="client-heatmap-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 180,
              backgroundColor: BACKDROP,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
        )}
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
          {open && (
            <motion.aside
              key="client-heatmap-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="client-heatmap-heading"
              initial={{ y: 40, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: { type: 'spring', damping: 28, stiffness: 340, mass: 0.9 },
              }}
              exit={{ y: 40, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
              onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                width: 'min(300px, 100%)',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(165deg, #14181E 0%, #101216 55%, #0C0E11 100%)',
                border: `0.5px solid ${BORDER_CELESTE_T}`,
                borderRadius: 18,
                boxShadow: '0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 44px',
                  alignItems: 'flex-start',
                  padding: '12px 0 8px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', paddingLeft: 20, paddingTop: 2, lineHeight: 0 }}>
                  <Info size={20} strokeWidth={2.35} color={INFO_CELESTE} aria-hidden />
                </div>
                <h2
                  id="client-heatmap-heading"
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#F0F0F0',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Estados del mapa
                </h2>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', paddingTop: 2, paddingRight: 20 }}>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={onClose}
                    style={{ border: 'none', background: 'none', padding: 8, margin: -8, display: 'flex', alignItems: 'center', cursor: 'pointer', lineHeight: 0 }}
                  >
                    <X size={22} strokeWidth={2.35} color={INFO_CELESTE} aria-hidden />
                  </button>
                </div>
              </div>

              <div
                style={{
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
                    transition={{ delay: 0.02 + index * 0.02, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: index < LEGEND_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <LegendDot row={row} />
                    <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB', lineHeight: 1.4, flex: 1 }}>
                      {row.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
