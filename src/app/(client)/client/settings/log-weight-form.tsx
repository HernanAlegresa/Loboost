'use client'

import { useActionState } from 'react'
import { logOwnWeightAction } from '@/features/clients/actions/log-own-weight'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, width: '100%', boxSizing: 'border-box' as const,
}

export default function LogWeightForm() {
  const today = new Date().toISOString().split('T')[0]
  const action = (_prev: unknown, formData: FormData) => logOwnWeightAction(formData)
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: T.text }}>Registrar mi peso</p>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
          <input name="date" type="date" defaultValue={today} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Peso en kg</label>
          <input name="weightKg" type="number" step="0.1" placeholder="75.5" style={inputStyle} />
        </div>
        {state && !state.success && (
          <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
        )}
        {state?.success && (
          <p style={{ fontSize: 12, color: T.lime, margin: 0 }}>✓ Peso registrado correctamente</p>
        )}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '12px 0', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Guardando...' : 'Guardar peso'}
        </button>
      </form>
    </div>
  )
}
