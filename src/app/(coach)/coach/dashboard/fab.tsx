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
              backgroundColor: 'rgba(10, 10, 10, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Speed dial */}
      <div
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        {/* Acciones — aparecen de abajo hacia arriba */}
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
                    gap: 14,
                    backgroundColor: '#111317',
                    border: '1px solid rgba(181,242,61,0.2)',
                    borderRadius: 16,
                    padding: '16px 20px',
                    textDecoration: 'none',
                    minWidth: 200,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                >
                  <action.icon size={22} color="#B5F23D" strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#B5F23D',
                    }}
                  >
                    {action.label}
                  </span>
                </Link>
              </motion.div>
            ))}
        </AnimatePresence>

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
