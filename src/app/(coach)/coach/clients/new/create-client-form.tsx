'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { createClientAction } from '@/features/clients/actions/create-client'
import { GOAL_OPTIONS } from '@/features/clients/schemas'
import SuccessOverlay from './success-overlay'
import type { CreateClientState } from '@/features/clients/types'
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
  color: '#F0F0F0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
  textAlign: 'center',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function CreateClientForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CreateClientState, FormData>(
    createClientAction,
    null
  )
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/coach/clients/${state.clientId}`)
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  return (
    <>
      {state?.success && <SuccessOverlay clientName={state.clientName} />}

      <div
        style={{
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 44px',
            alignItems: 'center',
            padding: '16px 20px 24px',
            flexShrink: 0,
            backgroundColor: '#0A0A0A',
          }}
        >
          <Link
            href="/coach/clients"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              color: '#B5F23D',
              textDecoration: 'none',
              minHeight: 44,
            }}
          >
            <ChevronLeft size={24} />
          </Link>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', textAlign: 'center' }}>
            Nuevo cliente
          </span>
          <div aria-hidden />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
          }}
        >
          <form
            action={formAction}
            style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 32 }}
          >
          {/* Secci?n 1: Datos del cliente */}
          <div>
            <p style={sectionTitleStyle}>Datos del cliente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Nombre completo">
                <input
                  name="fullName"
                  type="text"
                  required
                  style={inputStyle}
                  placeholder="Sof?a Torres"
                />
              </Field>

              <Field label="Sexo">
                <CustomSelect
                  name="sex"
                  required
                  options={[
                    { value: 'female', label: 'Femenino' },
                    { value: 'male', label: 'Masculino' },
                    { value: 'other', label: 'Otro' },
                  ]}
                />
              </Field>

              {/* Edad / Peso / Altura en fila */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Edad">
                  <input
                    name="age"
                    type="number"
                    required
                    min={10}
                    max={100}
                    style={inputStyle}
                    placeholder="25"
                  />
                </Field>
                <Field label="Peso (kg)">
                  <input
                    name="weightKg"
                    type="number"
                    required
                    min={20}
                    max={300}
                    style={inputStyle}
                    placeholder="65"
                  />
                </Field>
                <Field label="Alt (cm)">
                  <input
                    name="heightCm"
                    type="number"
                    required
                    min={100}
                    max={250}
                    style={inputStyle}
                    placeholder="165"
                  />
                </Field>
              </div>

              <Field label="Objetivo">
                <CustomSelect
                  name="goal"
                  required
                  options={GOAL_OPTIONS.map((g) => ({ value: g, label: g }))}
                />
              </Field>

              <Field label="Nivel de experiencia">
                <CustomSelect
                  name="experienceLevel"
                  required
                  options={[
                    { value: 'beginner', label: 'Principiante' },
                    { value: 'intermediate', label: 'Intermedio' },
                    { value: 'advanced', label: 'Avanzado' },
                  ]}
                />
              </Field>

              <Field label="D?as disponibles por semana">
                <CustomSelect
                  name="daysPerWeek"
                  required
                  options={[1, 2, 3, 4, 5, 6].map((d) => ({
                    value: String(d),
                    label: `${d} ${d === 1 ? 'd?a' : 'd?as'}`,
                  }))}
                />
              </Field>

              <Field label='Lesiones o limitaciones'>
                <input
                  name="injuries"
                  type="text"
                  style={inputStyle}
                  placeholder='Ej: "Rodilla derecha" o dejar vac?o si no hay'
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#1F2227' }} />

          {/* Secci?n 2: Cuenta del cliente */}
          <div>
            <p style={sectionTitleStyle}>Cuenta del cliente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  style={inputStyle}
                  placeholder="sofia@email.com"
                />
              </Field>

              <Field label="Contrase?a">
                <div style={{ position: 'relative' }}>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    placeholder="M?nimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword
                      ? <EyeOff size={18} color="#6B7280" />
                      : <Eye size={18} color="#6B7280" />
                    }
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Error banner */}
          {state && !state.success && (
            <div
              style={{
                backgroundColor: 'rgba(242,82,82,0.1)',
                border: '1px solid rgba(242,82,82,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14,
                color: '#F25252',
              }}
            >
              {state.error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              alignSelf: 'center',
              width: 'fit-content',
              minWidth: 0,
              padding: '0 24px',
              height: 52,
              backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
              color: '#0A0A0A',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              borderRadius: 12,
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {isPending ? 'Creando cliente...' : 'Guardar cliente'}
          </button>
          </form>
        </div>
      </div>
    </>
  )
}
