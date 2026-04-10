'use client'

import { useActionState, useEffect, useRef, type CSSProperties } from 'react'
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
  const [state, formAction, isPending] = useActionState<UpdateCoachProfileState, FormData>(
    updateCoachProfileAction,
    null
  )

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
          defaultValue={initialFullName}
          disabled={isPending}
          style={inputStyle}
        />
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.45 }}>
          Así te mostramos en el panel y en los saludos.
        </p>
      </div>

      {state && !state.success && 'error' in state && (
        <p role="alert" style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>
          {state.error}
        </p>
      )}

      {state?.success && (
        <p role="status" style={{ fontSize: 13, color: '#B5F23D', lineHeight: 1.45 }}>
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          height: 46,
          borderRadius: 12,
          border: 'none',
          fontSize: 15,
          fontWeight: 700,
          color: '#0A0A0A',
          backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
          cursor: isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? 'Guardando...' : 'Guardar nombre'}
      </button>
    </form>
  )
}
