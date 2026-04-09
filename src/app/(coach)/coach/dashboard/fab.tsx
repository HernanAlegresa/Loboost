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
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ duration: 0.18, delay: (ACTIONS.length - 1 - i) * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                {/* Etiqueta */}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#F0F0F0',
                    backgroundColor: '#1A1D22',
                    border: '1px solid #1F2227',
                    borderRadius: 8,
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {action.label}
                </span>

                {/* Mini FAB */}
                <Link
                  href={action.href}
                  onClick={() => setOpen(false)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#1A1D22',
                    border: '1px solid #2A2D34',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  <action.icon size={20} color="#F0F0F0" />
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
