'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  hint?: string
}

export default function CoachSuccessOverlay({ title, subtitle, hint = 'Redirigiendo...' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '40px 32px',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 24,
          minWidth: 260,
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 16 }}
        >
          <CheckCircle2 size={72} color="#B5F23D" strokeWidth={1.5} />
        </motion.div>

        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginBottom: 6 }}>{title}</p>
          {subtitle ? (
            <p style={{ fontSize: 15, color: '#B5F23D', fontWeight: 500, margin: 0 }}>{subtitle}</p>
          ) : null}
        </div>

        <p style={{ fontSize: 12, color: '#6B7280' }}>{hint}</p>
      </motion.div>
    </motion.div>
  )
}
