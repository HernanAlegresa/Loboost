'use client'

import { useActionState, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateCoachProfileAction,
  type UpdateCoachProfileState,
} from '@/features/coach/actions/update-coach-profile'

const INPUT_MAX_CHARS = 120

const inputStyle = (disabled: boolean): CSSProperties => ({
  width: '100%',
  height: 46,
  backgroundColor: '#0F1014',
  border: '1px solid #2A2D34',
  borderRadius: 12,
  padding: '0 14px',
  color: '#F0F0F0',
  fontSize: 15,
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
  opacity: disabled ? 0.7 : 1,
})

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

  const normalizedInitialName = initialFullName.trim()
  const normalizedName = name.trim()
  const dirty = normalizedName !== normalizedInitialName
  const isOverLimit = name.length > INPUT_MAX_CHARS
  const initials = (normalizedInitialName[0] ?? 'C').toUpperCase()

  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 30 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 9999,
              border: '1px solid rgba(181, 242, 61, 0.4)',
              backgroundColor: '#1A1D22',
              color: '#B5F23D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              flexShrink: 0,
            }}
            aria-hidden
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', margin: 0, lineHeight: 1.25 }}>
              {normalizedInitialName || 'Sin nombre'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => {
                  setName(initialFullName)
                  setEditing(true)
                }}
                style={{
                  width: 'fit-content',
                  marginTop: 10,
                  minWidth: 0,
                  padding: '0 12px',
                  height: 30,
                  borderRadius: 25,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#000000',
                  backgroundColor: '#B5F23D',
                  cursor: 'pointer',
                  transition: 'border-color 160ms ease, background-color 160ms ease',
                }}
              >
                Editar nombre
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <input
          id="settings-full-name"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          maxLength={INPUT_MAX_CHARS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Nombre visible"
          style={inputStyle(isPending)}
        />
      </div>

      {state && !state.success && 'error' in state && (
        <p
          role="alert"
          style={{
            fontSize: 13,
            color: '#F25252',
            lineHeight: 1.45,
            backgroundColor: 'rgba(242, 82, 82, 0.1)',
            border: '1px solid rgba(242, 82, 82, 0.22)',
            borderRadius: 10,
            padding: '10px 12px',
            margin: 0,
          }}
        >
          {state.error}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button
          type="submit"
          disabled={isPending || !dirty || isOverLimit}
          style={{
            height: 30,
            borderRadius: 20,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: '#000000',
            backgroundColor: isPending || !dirty || isOverLimit ? '#8BA82B' : '#B5F23D',
            cursor: isPending || !dirty || isOverLimit ? 'not-allowed' : 'pointer',
            padding: '0 18px',
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
            height: 40,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.85)',
            backgroundColor: 'transparent',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.65 : 1,
            padding: '0 18px',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}