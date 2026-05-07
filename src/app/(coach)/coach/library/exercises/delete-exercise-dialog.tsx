'use client'

import { AnimatePresence, motion } from 'framer-motion'

type Props = {
  exerciseName: string
  open: boolean
  isPending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteExerciseDialog({
  exerciseName,
  open,
  isPending,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exercise-title"
          onClick={() => {
            if (!isPending) onCancel()
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
            padding: 16,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              width: 'min(100%, 520px)',
              backgroundColor: '#111317',
              border: '1px solid #F25252',
              borderRadius: 16,
              padding: '20px 20px 24px',
            }}
          >
            <p id="delete-exercise-title" style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', textAlign: 'center' }}>
              ¿Eliminar ejercicio?
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
              Se eliminará <span style={{ color: '#F0F0F0', fontWeight: 600 }}>{exerciseName}</span>.
              Si está en un plan, la base de datos no permitirá borrarlo.
            </p>
            {error && (
              <p style={{ fontSize: 13, color: '#F25252', marginTop: 12, lineHeight: 1.45 }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: isPending ? 'default' : 'pointer',
                  padding: '10px 14px',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#F0F0F0',
                  backgroundColor: isPending ? '#7A2C2C' : '#F25252',
                  border: 'none',
                  borderRadius: 10,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  padding: '10px 16px',
                }}
              >
                {isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
