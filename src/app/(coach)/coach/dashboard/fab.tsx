'use client'

import { useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { UserPlus, ClipboardList, Dumbbell, Plus } from 'lucide-react'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'

const FAB_SIZE_PX = 56
const FAB_GAP_PX = 22

const ACTIONS = [
  { label: 'Nuevo ejercicio', icon: Dumbbell, href: '/coach/exercises/new' },
  { label: 'Nuevo plan', icon: ClipboardList, href: '/coach/plans/new' },
  { label: 'Nuevo cliente', icon: UserPlus, href: '/coach/clients/new' },
]

/** Sombra de profundidad (negra), sin halo lima. */
const FAB_DEPTH_SHADOW =
  '0 10px 28px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'

export type FabDock = 'fixed' | 'inline'

type FabProps = {
  /** `inline`: flujo en columna (dashboard mapa); `fixed`: sobre el viewport (por defecto). */
  dock?: FabDock
}

export default function Fab({ dock = 'fixed' }: FabProps) {
  const [open, setOpen] = useState(false)

  const shellStyle =
    dock === 'fixed'
      ? {
          position: 'fixed' as const,
          bottom: `calc(${SAFE_BOTTOM_NAV_HEIGHT} + ${FAB_GAP_PX}px)`,
          left: 0,
          right: 0,
          zIndex: 20,
          pointerEvents: 'none' as const,
        }
      : {
          position: 'relative' as const,
          zIndex: 20,
          width: '100%',
          pointerEvents: 'none' as const,
        }

  /** Contenedor de anclaje: el FAB queda siempre en bottom-center; las acciones crecen hacia arriba. */
  const anchorStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: FAB_SIZE_PX,
    pointerEvents: 'none',
  }

  const actionsWrapStyle: CSSProperties = {
    pointerEvents: 'auto',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: FAB_SIZE_PX + FAB_GAP_PX,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 22,
    zIndex: 21,
  }

  const fabWrapStyle: CSSProperties = {
    pointerEvents: 'auto',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 0,
    zIndex: 22,
  }

  return (
    <>
      {/* Backdrop invisible — cierra al tocar fuera */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 18,
              backgroundColor: 'rgba(10, 10, 10, 0.82)',
              backdropFilter: 'blur(22px) saturate(140%)',
              WebkitBackdropFilter: 'blur(22px) saturate(140%)',
            }}
          />
        )}
      </AnimatePresence>

      <div style={shellStyle}>
        <div style={anchorStyle}>
          <div style={actionsWrapStyle}>
            <AnimatePresence>
              {open &&
                ACTIONS.map((action, i) => (
                  <motion.div
                    key={action.href}
                    initial={{ opacity: 0, y: 16, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.92 }}
                    transition={{ duration: 0.2, delay: (ACTIONS.length - 1 - i) * 0.06 }}
                  >
                    <Link
                      href={action.href}
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        backgroundColor: '#111317',
                        border: '1px solid #2A2D34',
                        borderRadius: 18,
                        padding: '18px 26px',
                        textDecoration: 'none',
                        minWidth: 260,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      <action.icon size={26} color="#B5F23D" strokeWidth={2} />
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#B5F23D',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {action.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          <div style={fabWrapStyle}>
            <motion.button
              type="button"
              onClick={() => setOpen((v) => !v)}
              animate={{ rotate: open ? 45 : 0 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                width: FAB_SIZE_PX,
                height: FAB_SIZE_PX,
                borderRadius: 16,
                backgroundColor: '#B5F23D',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: FAB_DEPTH_SHADOW,
              }}
            >
              <Plus size={24} color="#0A0A0A" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  )
}
