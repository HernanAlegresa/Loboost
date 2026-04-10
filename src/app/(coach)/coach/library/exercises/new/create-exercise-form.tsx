'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createExerciseAction, type CreateExerciseState } from '@/features/exercises/actions/create-exercise'
import CustomSelect from '@/components/ui/custom-select'

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 20px 24px',
          position: 'sticky',
          top: 0,
          backgroundColor: '#0A0A0A',
          zIndex: 10,
        }}
      >
        <Link
          href="/coach/library/exercises"
          style={{ display: 'flex', alignItems: 'center', color: '#6B7280', textDecoration: 'none' }}
        >
          <ChevronLeft size={22} />
        </Link>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>Nuevo ejercicio</span>
      </div>

      <form
        action={formAction}
        style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 28 }}
      >
        <div>
          <p style={sectionTitleStyle}>Datos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre">
              <input name="name" type="text" required style={inputStyle} placeholder="Press banca" />
            </Field>

            <Field label="Grupo muscular">
              <input name="muscleGroup" type="text" required style={inputStyle} placeholder="Pecho" />
            </Field>

            <Field label="Categoria">
              <input name="category" type="text" required style={inputStyle} placeholder="Fuerza" />
            </Field>

            <Field label="Tipo">
              <CustomSelect
                name="type"
                required
                placeholder="Tipo"
                options={[
                  { value: 'strength', label: 'Fuerza' },
                  { value: 'cardio', label: 'Cardio' },
                ]}
              />
            </Field>

            <Field label="Video URL (opcional)">
              <input
                name="videoUrl"
                type="url"
                style={inputStyle}
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>

        {state && !state.success && 'error' in state && (
          <p style={{ fontSize: 13, color: '#F25252' }}>{state.error}</p>
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
