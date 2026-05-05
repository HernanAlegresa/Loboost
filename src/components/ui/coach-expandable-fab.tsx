'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, type LucideIcon } from 'lucide-react'

type ExpandDirection = 'up' | 'down'

type FabAction = {
  label: string
  href: string
  icon: LucideIcon
}

type Props = {
  actions: FabAction[]
  expandDirection?: ExpandDirection
  fabAriaLabel?: string
  menuOffsetPx?: number
  actionsGapPx?: number
}

const FAB_SIZE_PX = 48
const FAB_MENU_GAP_PX = 12
const FAB_ACTIONS_GAP_PX = 14
const FAB_DEPTH_SHADOW =
  '0 10px 28px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
const FAB_ACTION_BORDER_LIME = 'rgba(181, 242, 61, 0.62)'

export default function CoachExpandableFab({
  actions,
  expandDirection = 'up',
  fabAriaLabel = 'Abrir acciones de creación',
  menuOffsetPx = FAB_MENU_GAP_PX,
  actionsGapPx = FAB_ACTIONS_GAP_PX,
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const menuPlacement =
    expandDirection === 'down'
      ? { top: `calc(100% + ${menuOffsetPx}px)` }
      : { bottom: `calc(100% + ${menuOffsetPx}px)` }

  const enterY = expandDirection === 'down' ? -12 : 12

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            key="fab-backdrop"
            type="button"
            aria-label="Cerrar menú de creación"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 18,
              border: 'none',
              padding: 0,
              margin: 0,
              backgroundColor: 'rgba(10, 10, 10, 0.82)',
              backdropFilter: 'blur(22px) saturate(140%)',
              WebkitBackdropFilter: 'blur(22px) saturate(140%)',
              cursor: 'pointer',
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 20, display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence>
          {open ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: actionsGapPx,
                ...menuPlacement,
              }}
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, y: enterY, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: enterY, scale: 0.92 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Link
                    href={action.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                      backgroundColor: '#111317',
                      border: `1px solid ${FAB_ACTION_BORDER_LIME}`,
                      borderRadius: 18,
                      padding: '16px 20px',
                      textDecoration: 'none',
                      minWidth: 220,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <action.icon size={26} color="#B5F23D" strokeWidth={2} />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#B5F23D',
                        letterSpacing: '0.01em',
                        textAlign: 'center',
                      }}
                    >
                      {action.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={fabAriaLabel}
          onClick={() => setOpen((v) => !v)}
          animate={{ rotate: open ? 45 : 0 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            width: FAB_SIZE_PX,
            height: FAB_SIZE_PX,
            borderRadius: 9999,
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
    </>
  )
}
