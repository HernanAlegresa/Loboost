'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteExerciseAction } from '@/features/exercises/actions/delete-exercise'
import type { ExerciseRow } from './queries'
import DeleteExerciseDialog from './delete-exercise-dialog'

const TYPE_LABEL: Record<string, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
}

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
          borderRadius: 14,
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>Tu biblioteca está vacía</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
          Creá el primer ejercicio con el botón <span style={{ color: '#B5F23D' }}>+</span>. Los vas a
          reutilizar al armar planes.
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {exercises.map((ex) => (
          <div
            key={ex.id}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              opacity: isPending && pendingId === ex.id ? 0.55 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#F0F0F0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ex.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ex.muscle_group} · {ex.category} · {TYPE_LABEL[ex.type] ?? ex.type}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => openDelete(ex)}
              aria-label={`Eliminar ejercicio ${ex.name}`}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: isPending ? 'default' : 'pointer',
                color: '#6B7280',
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
