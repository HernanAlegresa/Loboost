'use client'

import { useActionState, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { assignPlanAction, type AssignPlanState } from '@/features/plans/actions/assign-plan'
import type { ClientPick } from '../../queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import CustomSelect from '@/components/ui/custom-select'

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function localTodayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Props = {
  planId: string
  planName: string
  planWeeks: number
  clients: ClientPick[]
}

export default function AssignPlanForm({ planId, planName, planWeeks, clients }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [startDate, setStartDate] = useState(localTodayISODate)

  const [state, formAction, isPending] = useActionState<AssignPlanState, FormData>(
    assignPlanAction,
    null
  )

  const canSubmit = clients.length > 0 && clientId !== ''

  useEffect(() => {
    if (state?.success) {
      router.push(`/coach/clients/${clientId}`)
    }
  }, [state, router, clientId])

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
    [clients]
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FlowHeaderConfig title="Asignar plan" subtitle={planName} fallbackHref={`/coach/library/plans/${planId}`} />

      <form
        action={formAction}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: '16px 20px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <input type="hidden" name="planId" value={planId} readOnly />

        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
            {planWeeks} {planWeeks === 1 ? 'semana' : 'semanas'} · Se crea una copia activa para el cliente
          </p>
        </div>

        {clients.length === 0 ? (
          <div
            role="status"
            style={{
              backgroundColor: 'rgba(242, 153, 74, 0.08)',
              border: '1px solid rgba(242, 153, 74, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#F2994A', lineHeight: 1.45 }}>
              No tenés clientes todavía. Creá uno desde el panel del coach para poder asignar planes.
            </p>
          </div>
        ) : (
          <>
            <Field label="Cliente">
              <CustomSelect
                name="clientId"
                required
                value={clientId}
                onChange={setClientId}
                placeholder="Elegí un cliente"
                options={sortedClients.map((c) => ({
                  value: c.id,
                  label: c.full_name?.trim() || 'Sin nombre',
                }))}
              />
            </Field>

            <Field label="Fecha de inicio">
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={inputStyle}
              />
            </Field>
          </>
        )}

        {state && !state.success && 'error' in state && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(242, 82, 82, 0.08)',
              border: '1px solid rgba(242, 82, 82, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45 }}>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          style={{
            alignSelf: 'center',
            width: 'fit-content',
            minWidth: 0,
            padding: '0 24px',
            height: 48,
            borderRadius: 12,
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: '#0A0A0A',
            backgroundColor: isPending || !canSubmit ? '#8BA82B' : '#B5F23D',
            cursor: isPending || !canSubmit ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Asignando...' : 'Asignar al cliente'}
        </button>
      </form>
    </div>
  )
}
