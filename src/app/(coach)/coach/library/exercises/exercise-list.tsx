'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteExerciseAction } from '@/features/exercises/actions/delete-exercise'
import type { ExerciseRow } from './queries'

const TYPE_LABEL: Record<string, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
}

export default function ExerciseList({ exercises }: { exercises: ExerciseRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('Eliminar este ejercicio?')) return
    startTransition(async () => {
      const result = await deleteExerciseAction(id)
      if (result.error) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  if (exercises.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '32px 0' }}>
        No hay ejercicios todavia. Toca + para crear el primero.
      </p>
    )
  }

  return (
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
            onClick={() => handleDelete(ex.id)}
            aria-label="Eliminar ejercicio"
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
  )
}
