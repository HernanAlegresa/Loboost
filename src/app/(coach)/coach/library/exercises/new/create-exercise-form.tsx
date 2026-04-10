'use client'

import { useActionState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createExerciseAction, type CreateExerciseState } from '@/features/exercises/actions/create-exercise'
import CustomSelect from '@/components/ui/custom-select'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'

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
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function CreateExerciseForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CreateExerciseState, FormData>(
    createExerciseAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      router.push('/coach/library/exercises')
    }
  }, [state, router])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader backHref="/coach/library/exercises" title="Nuevo ejercicio" />

      <form
        action={formAction}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div>
          <p style={sectionTitleStyle}>Datos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre">
              <input
                name="name"
                type="text"
                required
                style={inputStyle}
                placeholder="Press de banca"
                autoComplete="off"
              />
            </Field>

            <Field label="Grupo muscular">
              <input
                name="muscleGroup"
                type="text"
                required
                style={inputStyle}
                placeholder="Pecho"
                autoComplete="off"
              />
            </Field>

            <Field label="Categoría">
              <input
                name="category"
                type="text"
                required
                style={inputStyle}
                placeholder="Empuje, tirón, piernas…"
                autoComplete="off"
              />
            </Field>

            <Field label="Tipo">
              <CustomSelect
                name="type"
                required
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
                style={inputStyle}
                placeholder="https://youtube.com/…"
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
          disabled={isPending}
          style={{
            height: 48,
            borderRadius: 12,
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: '#0A0A0A',
            backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Crear ejercicio'}
        </button>
      </form>
    </div>
  )
}
