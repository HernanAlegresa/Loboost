'use client'

import { useActionState, useState } from 'react'
import { updateClientAction } from '@/features/clients/actions/update-client'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF', bg: '#0F1014',
} as const

type Props = {
  clientId: string
  initial: {
    age: number | null
    sex: 'male' | 'female' | 'other' | null
    goal: string | null
    weightKg: number | null
    heightCm: number | null
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
    daysPerWeek: number
    injuries: string | null
  }
}

const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 14, boxSizing: 'border-box' as const,
}

const labelStyle = { fontSize: 11, color: T.muted, marginBottom: 4, display: 'block' as const }

export default function EditClientForm({ clientId, initial }: Props) {
  const [open, setOpen] = useState(false)

  const action = async (_prev: unknown, formData: FormData) => {
    const result = await updateClientAction(clientId, formData)
    if (result.success) setOpen(false)
    return result
  }

  const [state, formAction, pending] = useActionState(action, null)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12, width: '100%', padding: '10px 0',
          backgroundColor: 'transparent', border: `1px solid ${T.border}`,
          borderRadius: 10, color: T.secondary, fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Editar datos del cliente
      </button>
    )
  }

  return (
    <form action={formAction} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Editar perfil</p>

      <div>
        <label style={labelStyle}>Objetivo</label>
        <input name="goal" defaultValue={initial.goal ?? ''} style={inputStyle} placeholder="Ej: Ganar masa muscular" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Edad</label>
          <input name="age" type="number" defaultValue={initial.age ?? ''} style={inputStyle} min={10} max={100} />
        </div>
        <div>
          <label style={labelStyle}>Días / semana</label>
          <input name="daysPerWeek" type="number" defaultValue={initial.daysPerWeek} style={inputStyle} min={1} max={7} />
        </div>
        <div>
          <label style={labelStyle}>Peso (kg)</label>
          <input name="weightKg" type="number" step="0.1" defaultValue={initial.weightKg ?? ''} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Altura (cm)</label>
          <input name="heightCm" type="number" defaultValue={initial.heightCm ?? ''} style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Sexo</label>
        <select name="sex" defaultValue={initial.sex ?? ''} style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">Sin especificar</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Nivel de experiencia</label>
        <select name="experienceLevel" defaultValue={initial.experienceLevel ?? ''} style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">Sin especificar</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Lesiones / limitaciones</label>
        <textarea
          name="injuries"
          defaultValue={initial.injuries ?? ''}
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="Ej: Dolor lumbar crónico"
        />
      </div>

      {state && !state.success && (
        <p style={{ fontSize: 12, color: '#F25252', margin: 0 }}>{state.error}</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: 'transparent',
            border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: T.lime,
            border: 'none', borderRadius: 10,
            color: '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
