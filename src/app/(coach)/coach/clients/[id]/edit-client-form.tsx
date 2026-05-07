'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientAction } from '@/features/clients/actions/update-client'
import CoachSuccessOverlay from '@/components/ui/coach-success-overlay'
import CustomSelect from '@/components/ui/custom-select'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF', bg: '#0F1014',
} as const

type Props = {
  clientId: string
  cancelHref?: string
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

export default function EditClientForm({
  clientId,
  initial,
  cancelHref,
}: Props) {
  const router = useRouter()
  const [values, setValues] = useState(() => ({
    goal: initial.goal ?? '',
    age: initial.age != null ? String(initial.age) : '',
    daysPerWeek: String(initial.daysPerWeek),
    weightKg: initial.weightKg != null ? String(initial.weightKg) : '',
    heightCm: initial.heightCm != null ? String(initial.heightCm) : '',
    sex: initial.sex ?? '',
    experienceLevel: initial.experienceLevel ?? '',
    injuries: initial.injuries ?? '',
  }))

  const action = async (_prev: unknown, formData: FormData) => {
    return updateClientAction(clientId, formData)
  }

  const [state, formAction, pending] = useActionState(action, null)
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        goal: initial.goal ?? '',
        age: initial.age != null ? String(initial.age) : '',
        daysPerWeek: String(initial.daysPerWeek),
        weightKg: initial.weightKg != null ? String(initial.weightKg) : '',
        heightCm: initial.heightCm != null ? String(initial.heightCm) : '',
        sex: initial.sex ?? '',
        experienceLevel: initial.experienceLevel ?? '',
        injuries: initial.injuries ?? '',
      }),
    [initial]
  )
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        ...values,
        goal: values.goal.trim(),
        injuries: values.injuries.trim(),
      }),
    [values]
  )
  const hasChanges = currentSnapshot !== initialSnapshot

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      const timer = setTimeout(() => {
        router.push(cancelHref ?? `/coach/clients/${clientId}?tab=profile`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state, router, clientId, cancelHref])

  return (
    <form action={formAction} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {state && 'success' in state && state.success ? (
        <CoachSuccessOverlay
          title="¡Datos actualizados!"
          hint="Volviendo al perfil del cliente..."
        />
      ) : null}
      <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Editar perfil</p>

      <div>
        <label style={labelStyle}>Objetivo</label>
        <input
          name="goal"
          value={values.goal}
          onChange={(e) => setValues((prev) => ({ ...prev, goal: e.target.value }))}
          style={inputStyle}
          placeholder="Ej: Ganar masa muscular"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Edad</label>
          <input
            name="age"
            type="number"
            value={values.age}
            onChange={(e) => setValues((prev) => ({ ...prev, age: e.target.value }))}
            style={inputStyle}
            min={10}
            max={100}
          />
        </div>
        <div>
          <label style={labelStyle}>Días / semana</label>
          <input
            name="daysPerWeek"
            type="number"
            value={values.daysPerWeek}
            onChange={(e) => setValues((prev) => ({ ...prev, daysPerWeek: e.target.value }))}
            style={inputStyle}
            min={1}
            max={7}
          />
        </div>
        <div>
          <label style={labelStyle}>Peso (kg)</label>
          <input
            name="weightKg"
            type="number"
            step="0.1"
            value={values.weightKg}
            onChange={(e) => setValues((prev) => ({ ...prev, weightKg: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Altura (cm)</label>
          <input
            name="heightCm"
            type="number"
            value={values.heightCm}
            onChange={(e) => setValues((prev) => ({ ...prev, heightCm: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Sexo</label>
        <CustomSelect
          name="sex"
          value={values.sex}
          onChange={(value) => setValues((prev) => ({ ...prev, sex: value }))}
          placeholder="Sin especificar"
          options={[
            { value: 'male', label: 'Masculino' },
            { value: 'female', label: 'Femenino' },
            { value: 'other', label: 'Otro' },
          ]}
        />
      </div>

      <div>
        <label style={labelStyle}>Nivel de experiencia</label>
        <CustomSelect
          name="experienceLevel"
          value={values.experienceLevel}
          onChange={(value) => setValues((prev) => ({ ...prev, experienceLevel: value }))}
          placeholder="Sin especificar"
          options={[
            { value: 'beginner', label: 'Principiante' },
            { value: 'intermediate', label: 'Intermedio' },
            { value: 'advanced', label: 'Avanzado' },
          ]}
        />
      </div>

      <div>
        <label style={labelStyle}>Lesiones / limitaciones</label>
        <textarea
          name="injuries"
          value={values.injuries}
          onChange={(e) => setValues((prev) => ({ ...prev, injuries: e.target.value }))}
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
          onClick={() => {
            if (cancelHref) {
              router.push(cancelHref)
              return
            }
            router.back()
          }}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: 'transparent',
            border: 'none', borderRadius: 10,
            color: T.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !hasChanges}
          style={{
            flex: 1, padding: '11px 0', backgroundColor: pending || !hasChanges ? '#8BA82B' : T.lime,
            border: 'none', borderRadius: 25,
            color: '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: pending || !hasChanges ? 'not-allowed' : 'pointer',
            opacity: pending || !hasChanges ? 0.65 : 1,
          }}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
