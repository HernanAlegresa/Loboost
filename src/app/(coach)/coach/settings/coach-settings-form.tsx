'use client'

import { useActionState, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateCoachProfileAction,
  type UpdateCoachProfileState,
} from '@/features/coach/actions/update-coach-profile'

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

type Props = {
  initialFullName: string
}

export default function CoachSettingsForm({ initialFullName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialFullName)

  useEffect(() => {
    setName(initialFullName)
  }, [initialFullName])

  const [state, formAction, isPending] = useActionState<UpdateCoachProfileState, FormData>(
    updateCoachProfileAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      setEditing(false)
      router.refresh()
    }
  }, [state, router])

  const dirty = name.trim() !== initialFullName.trim()

  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ ...labelStyle, marginBottom: 6 }}>Nombre actual</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', margin: 0, lineHeight: 1.35 }}>
            {initialFullName.trim() || 'Sin nombre'}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.45 }}>
            Así te mostramos en el panel y en los saludos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setName(initialFullName)
            setEditing(true)
          }}
          style={{
            height: 46,
            borderRadius: 12,
            border: '1px solid #2A2D34',
            fontSize: 15,
            fontWeight: 600,
            color: '#B5F23D',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          Editar nombre
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor="settings-full-name" style={labelStyle}>
          Nombre visible
        </label>
        <input
          id="settings-full-name"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          style={inputStyle}
        />
      </div>

      {state && !state.success && 'error' in state && (
        <p role="alert" style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>
          {state.error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="submit"
          disabled={isPending || !dirty}
          style={{
            alignSelf: 'center',
            width: 'fit-content',
            minWidth: 0,
            padding: '0 24px',
            height: 46,
            borderRadius: 12,
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
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setName(initialFullName)
            setEditing(false)
          }}
          style={{
            height: 44,
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: '#6B7280',
            backgroundColor: 'transparent',
            cursor: isPending ? 'default' : 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
