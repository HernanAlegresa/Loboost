'use client'

import { useActionState } from 'react'
import { logBodyMeasurementAction } from '@/features/coach/actions/log-body-measurement'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', bg: '#0F1014',
} as const

const inputStyle = {
  padding: '9px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14,
}

export default function LogMeasurementForm({ clientId }: { clientId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const action = (_prev: unknown, formData: FormData) => logBodyMeasurementAction(formData)
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginTop: 12 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.text }}>Registrar peso</p>
      <form action={formAction} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <input type="hidden" name="clientId" value={clientId} />
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
          <input name="date" type="date" defaultValue={today} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>Peso (kg)</label>
          <input name="weightKg" type="number" step="0.1" placeholder="75.5" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '9px 16px', backgroundColor: T.lime, border: 'none',
            borderRadius: 10, color: '#0A0A0A', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', opacity: pending ? 0.6 : 1, whiteSpace: 'nowrap',
          }}
        >
          {pending ? '...' : '+ Peso'}
        </button>
      </form>
      {state && !state.success && (
        <p style={{ fontSize: 12, color: '#F25252', marginTop: 8 }}>{state.error}</p>
      )}
      {state?.success && (
        <p style={{ fontSize: 12, color: T.lime, marginTop: 8 }}>✓ Peso registrado</p>
      )}
    </div>
  )
}
