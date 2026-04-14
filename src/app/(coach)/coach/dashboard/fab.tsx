'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { UserPlus, ClipboardList, Dumbbell, Plus } from 'lucide-react'

const ACTIONS = [
  { label: 'Nuevo ejercicio', icon: Dumbbell,       href: '/coach/exercises/new' },
  { label: 'Nuevo plan',      icon: ClipboardList,  href: '/coach/plans/new'     },
  { label: 'Nuevo cliente',   icon: UserPlus,       href: '/coach/clients/new'   },
]

export default function Fab() {
  const [open, setOpen] = useState(false)

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

      {/* Speed dial */}
      <div
        style={{
          position: 'fixed',
          bottom: 104,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Acciones — más arriba respecto al FAB + más grandes */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
            marginBottom: open ? 28 : 0,
            transition: 'margin-bottom 0.2s ease',
          }}
        >
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
                      border: '1px solid rgba(181,242,61,0.22)',
                      borderRadius: 18,
                      padding: '18px 26px',
                      textDecoration: 'none',
                      minWidth: 260,
                      boxShadow: '0 6px 28px rgba(0,0,0,0.55)',
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

        {/* FAB principal — "+" rota a "×" */}
        <motion.button
          onClick={() => setOpen((v) => !v)}
          animate={{ rotate: open ? 45 : 0 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: '#B5F23D',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(181,242,61,0.25)',
          }}
        >
          <Plus size={24} color="#0A0A0A" strokeWidth={2.5} />
        </motion.button>
      </div>
    </>
  )
}
