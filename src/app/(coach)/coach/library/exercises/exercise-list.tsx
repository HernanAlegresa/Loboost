'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MUSCLE_GROUP_OPTIONS, muscleGroupLabel } from '@/features/exercises/muscle-groups'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteExerciseAction } from '@/features/exercises/actions/delete-exercise'
import type { ExerciseRow } from './queries'
import DeleteExerciseDialog from './delete-exercise-dialog'
import FilterTabs, { type FilterTabItem } from '@/components/ui/filter-tabs'

export default function ExerciseList({ exercises }: { exercises: ExerciseRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialogExercise, setDialogExercise] = useState<ExerciseRow | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const filteredExercises = useMemo(() => {
    if (selectedGroup === 'all') return exercises
    return exercises.filter((exercise) => exercise.muscle_group === selectedGroup)
  }, [exercises, selectedGroup])

  const orderedMuscleGroups = useMemo(() => {
    const desiredOrder = [
      'pecho',
      'espalda',
      'hombros',
      'cuadriceps',
      'isquiotibiales',
      'gluteos',
      'biceps',
      'triceps',
      'abdomen',
      'pantorrillas',
    ]

    return desiredOrder
      .map((value) => MUSCLE_GROUP_OPTIONS.find((option) => option.value === value))
      .filter((option): option is (typeof MUSCLE_GROUP_OPTIONS)[number] => option !== undefined)
  }, [])

  const filterItems = useMemo<FilterTabItem[]>(
    () => [
      {
        id: 'all',
        label: 'Todos',
        activeBackground: '#B5F23D',
        activeColor: '#0A0A0A',
      },
      ...orderedMuscleGroups.map((group) => ({
        id: group.value,
        label: group.label,
        activeBackground: '#B5F23D',
        activeColor: '#0A0A0A',
      })),
    ],
    [orderedMuscleGroups]
  )

  const LIST_BOTTOM_PADDING_PX = 120

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
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flexShrink: 0,
            backgroundColor: '#0A0A0A',
            paddingTop: 10,
            paddingBottom: 14,
          }}
        >
          <div
            style={{
              marginBottom: 4,
            }}
          >
            <FilterTabs
              items={filterItems}
              activeId={selectedGroup}
              onChange={setSelectedGroup}
              inactiveBackground="rgba(75, 85, 99, 0.34)"
              inactiveColor="rgba(218, 224, 233, 0.72)"
              inactiveBorder="transparent"
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            paddingTop: 10,
            paddingBottom: LIST_BOTTOM_PADDING_PX,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {filteredExercises.length === 0 ? (
            <div
              style={{
                backgroundColor: '#111317',
                border: '1px solid #1F2227',
                borderRadius: 14,
                padding: '18px 16px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
                No hay ejercicios para ese grupo muscular.
              </p>
            </div>
          ) : null}

          {filteredExercises.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isPending && pendingId === ex.id ? 0.55 : 1, y: 0 }}
              transition={{ duration: 0.18 }}
              whileTap={{ scale: 0.985 }}
              style={{
                backgroundColor: '#111317',
                borderRadius: 14,
                padding: '10px 12px 10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 400,
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
                    color: '#F0F0F0',
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
      </div>
    </>
  )
}
