'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { changePasswordAction } from '@/features/auth/actions/change-password'

const T = {
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: 'rgba(255,255,255,0.75)',
  bg: '#0F1014',
} as const

const inputStyle = {
  width: '100%',
  height: 46,
  padding: '0 14px',
  backgroundColor: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  color: T.text,
  fontSize: 15,
  boxSizing: 'border-box' as const,
  outline: 'none',
  caretColor: '#B5F23D',
}

const labelStyle = {
  fontSize: 11,
  color: T.muted,
  display: 'block' as const,
  marginBottom: 8,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
}

type Props = {
  variant?: 'card' | 'embedded'
  alwaysVisible?: boolean
}

export default function ChangePasswordForm({ variant = 'card', alwaysVisible = false }: Props) {
  const [state, formAction, pending] = useActionState(changePasswordAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const isEmbedded = variant === 'embedded'
  const hidePasswordToggle = alwaysVisible

  if (state?.success) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(181,242,61,0.08)',
          border: '1px solid rgba(181,242,61,0.2)',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: T.lime, fontWeight: 600, lineHeight: 1.4 }}>
          Listo. Tu contraseña fue actualizada correctamente.
        </p>
      </div>
    )
  }

  const containerStyle = isEmbedded
    ? { backgroundColor: 'transparent', border: 'none', borderRadius: 0, padding: 12 }
    : {
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '16px',
      }

  return (
    <div style={containerStyle}>
      {!isEmbedded && (
        <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: T.text }}>
          Cambiar contraseña
        </p>
      )}
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label htmlFor="change-password-new" style={labelStyle}>
            Nueva contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="change-password-new"
              name="password"
              type={alwaysVisible ? 'text' : showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              style={{
                ...inputStyle,
                ...(hidePasswordToggle ? {} : { paddingRight: 44 }),
              }}
            />
            {!hidePasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  color: '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="change-password-confirm" style={labelStyle}>
            Confirmar contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="change-password-confirm"
              name="confirm"
              type={alwaysVisible ? 'text' : showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repetí la contraseña"
              style={{
                ...inputStyle,
                ...(hidePasswordToggle ? {} : { paddingRight: 44 }),
              }}
            />
            {!hidePasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={
                  showConfirm ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'
                }
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  color: '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ) : null}
          </div>
        </div>

        {state && !state.success && (
          <p
            style={{
              fontSize: 13,
              color: '#F25252',
              margin: 0,
              lineHeight: 1.4,
              backgroundColor: 'rgba(242,82,82,0.1)',
              border: '1px solid rgba(242,82,82,0.22)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {state.error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: isEmbedded ? 'center' : 'stretch', marginTop: 10 }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              height: 40,
              backgroundColor: T.lime,
              border: 'none',
              borderRadius: 25,
              color: '#0A0A0A',
              fontSize: 14,
              fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.65 : 1,
              width: isEmbedded ? 'fit-content' : '100%',
              padding: '0 18px',
            }}
          >
            {pending ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}