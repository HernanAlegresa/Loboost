'use client'

import { useActionState, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateExerciseAction, type UpdateExerciseState } from '@/features/exercises/actions/update-exercise'
import { MUSCLE_GROUP_OPTIONS } from '@/features/exercises/muscle-groups'
import type { ExerciseEditRow } from '../../queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import CustomSelect from '@/components/ui/custom-select'

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#111317',
  border: '1px solid #2A2D34',
  borderRadius: 10,
  padding: '0 14px',
  color: '#F0F0F0',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
  textAlign: 'center',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function EditExerciseForm({ exercise }: { exercise: ExerciseEditRow }) {
  const router = useRouter()
  const initial = useMemo(
    () => ({
      name:        exercise.name,
      muscleGroup: exercise.muscle_group,
      type:        exercise.type,
      videoUrl:    exercise.video_url?.trim() ?? '',
    }),
    [exercise]
  )

  const [name,        setName]        = useState(initial.name)
  const [muscleGroup, setMuscleGroup] = useState(initial.muscleGroup)
  const [type,        setType]        = useState(initial.type)
  const [videoUrl,    setVideoUrl]    = useState(initial.videoUrl)

  const dirty =
    name.trim()     !== initial.name       ||
    muscleGroup     !== initial.muscleGroup ||
    type            !== initial.type        ||
    videoUrl.trim() !== initial.videoUrl

  const [state, formAction, isPending] = useActionState<UpdateExerciseState, FormData>(
    updateExerciseAction,
    null
  )

  useEffect(() => {
    if (state?.success) router.push('/coach/library?tab=exercises')
  }, [state, router])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FlowHeaderConfig title="Editar ejercicio" fallbackHref="/coach/library?tab=exercises" />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain' }}>
        <form
          action={formAction}
          style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <input type="hidden" name="exerciseId" value={exercise.id} readOnly />

          <div>
            <p style={sectionTitleStyle}>Datos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Nombre">
                <input
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>

              <Field label="Grupo muscular">
                <CustomSelect
                  name="muscleGroup"
                  required
                  value={muscleGroup}
                  onChange={setMuscleGroup}
                  placeholder="Seleccioná el grupo muscular"
                  options={MUSCLE_GROUP_OPTIONS}
                />
              </Field>

              <Field label="Tipo">
                <CustomSelect
                  name="type"
                  required
                  value={type}
                  onChange={setType}
                  placeholder="Elegí el tipo"
                  options={[
                    { value: 'strength', label: 'Fuerza' },
                    { value: 'cardio', label: 'Cardio' },
                  ]}
                />
              </Field>

              <Field label="Video (opcional)">
                <input
                  name="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  style={inputStyle}
                  inputMode="url"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>

          {state && !state.success && 'error' in state && (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(242, 82, 82, 0.08)',
                border: '1px solid rgba(242, 82, 82, 0.25)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !dirty}
            style={{
              alignSelf: 'center',
              width: 'fit-content',
              minWidth: 0,
              padding: '0 24px',
              height: 48,
              borderRadius: 25,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              color: '#0A0A0A',
              backgroundColor: isPending || !dirty ? '#8BA82B' : '#B5F23D',
              cursor: isPending || !dirty ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>

          <Link
            href="/coach/library?tab=exercises"
            style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#6B7280', textDecoration: 'none' }}
          >
            Cancelar
          </Link>
        </form>
      </div>
    </div>
  )
}
