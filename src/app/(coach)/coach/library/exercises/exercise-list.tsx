'use client'

import { useEffect, useState, useTransition } from 'react'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteExerciseAction } from '@/features/exercises/actions/delete-exercise'
import type { ExerciseRow } from './queries'
import DeleteExerciseDialog from './delete-exercise-dialog'

export default function ExerciseList({ exercises }: { exercises: ExerciseRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialogExercise, setDialogExercise] = useState<ExerciseRow | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogExercise) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        setDialogExercise(null)
        setDialogError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogExercise, isPending])

  function openDelete(ex: ExerciseRow) {
    setDialogError(null)
    setDialogExercise(ex)
  }

  function closeDelete() {
    if (isPending) return
    setDialogExercise(null)
    setDialogError(null)
  }

  function confirmDelete() {
    if (!dialogExercise) return
    setPendingId(dialogExercise.id)
    setDialogError(null)
    startTransition(async () => {
      const result = await deleteExerciseAction(dialogExercise.id)
      setPendingId(null)
      if (result.error) {
        setDialogError(result.error)
        return
      }
      setDialogExercise(null)
      router.refresh()
    })
  }

  if (exercises.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 16,
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>Tu biblioteca está vacía</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
          Creá el primer ejercicio con el botón <span style={{ color: '#B5F23D' }}>+</span>. Los vas a reutilizar al
          armar planes.
        </p>
      </div>
    )
  }

  return (
    <>
      <DeleteExerciseDialog
        open={dialogExercise !== null}
        exerciseName={dialogExercise?.name ?? ''}
        isPending={isPending && pendingId === dialogExercise?.id}
        error={dialogError}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {exercises.map((ex) => (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isPending && pendingId === ex.id ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.18 }}
            whileTap={{ scale: 0.985 }}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '14px 12px 14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#B5F23D',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                }}
              >
                {ex.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                  margin: '5px 0 0',
                  lineHeight: 1.45,
                }}
              >
                {muscleGroupLabel(ex.muscle_group)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              <Link
                href={`/coach/library/exercises/${ex.id}/edit`}
                aria-label={`Editar ${ex.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  color: '#9CA3AF',
                  textDecoration: 'none',
                  borderRadius: 8,
                  transition: 'color 150ms ease',
                }}
              >
                <Pencil size={18} />
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => openDelete(ex)}
                aria-label={`Eliminar ejercicio ${ex.name}`}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  cursor: isPending ? 'default' : 'pointer',
                  color: '#F25252',
                  borderRadius: 8,
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  )
}
