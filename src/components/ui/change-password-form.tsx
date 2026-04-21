'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/features/auth/actions/change-password'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, boxSizing: 'border-box' as const,
}

const labelStyle = {
  fontSize: 11, color: T.muted, display: 'block' as const, marginBottom: 4,
}

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null)

  if (state?.success) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(181,242,61,0.08)',
          border: '1px solid rgba(181,242,61,0.2)',
          borderRadius: 14, padding: '14px 16px',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: T.lime, fontWeight: 600 }}>
          ✓ Contraseña actualizada correctamente
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '16px',
      }}
    >
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: T.text }}>
        Cambiar contraseña
      </p>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Nueva contraseña</label>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirmar contraseña</label>
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            style={inputStyle}
          />
        </div>

        {state && !state.success && (
          <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '11px 0', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1, marginTop: 4,
          }}
        >
          {pending ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
