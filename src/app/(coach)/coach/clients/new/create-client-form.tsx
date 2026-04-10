'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { createClientAction } from '@/features/clients/actions/create-client'
import { GOAL_OPTIONS } from '@/features/clients/schemas'
import SuccessOverlay from './success-overlay'
import type { CreateClientState } from '@/features/clients/actions/create-client'

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
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <ChevronDown
        size={16}
        color="#6B7280"
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default function CreateClientForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CreateClientState, FormData>(
    createClientAction,
    null
  )

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

      <div style={{ height: '100%', overflowY: 'auto' }}>
        {/* Sub-header con back button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 20px 24px',
            position: 'sticky',
            top: 0,
            backgroundColor: '#0A0A0A',
            zIndex: 10,
          }}
        >
          <Link
            href="/coach/dashboard"
            style={{ display: 'flex', alignItems: 'center', color: '#6B7280', textDecoration: 'none' }}
          >
            <ChevronLeft size={22} />
          </Link>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0' }}>Nuevo cliente</span>
        </div>

        {/* Form */}
        <form
          action={formAction}
          style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 32 }}
        >
          {/* Sección 1: Datos del cliente */}
          <div>
            <p style={sectionTitleStyle}>Datos del cliente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Nombre completo">
                <input
                  name="fullName"
                  type="text"
                  required
                  style={inputStyle}
                  placeholder="Sofía Torres"
                />
              </Field>

              <Field label="Sexo">
                <SelectWrapper>
                  <select
                    name="sex"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Otro</option>
                  </select>
                </SelectWrapper>
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
                <SelectWrapper>
                  <select
                    name="goal"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    {GOAL_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </Field>

              <Field label="Nivel de experiencia">
                <SelectWrapper>
                  <select
                    name="experienceLevel"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </SelectWrapper>
              </Field>

              <Field label="Días disponibles por semana">
                <SelectWrapper>
                  <select
                    name="daysPerWeek"
                    required
                    defaultValue=""
                    style={{ ...inputStyle, appearance: 'none', paddingRight: 40 }}
                  >
                    <option value="" disabled>Seleccioná...</option>
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'día' : 'días'}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </Field>

              <Field label='Lesiones o limitaciones'>
                <input
                  name="injuries"
                  type="text"
                  required
                  style={inputStyle}
                  placeholder='Ej: "Rodilla derecha" o "Ninguna"'
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#1F2227' }} />

          {/* Sección 2: Cuenta del cliente */}
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

              <Field label="Contraseña">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  style={inputStyle}
                  placeholder="Mínimo 8 caracteres"
                />
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
              width: '100%',
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
    </>
  )
}
