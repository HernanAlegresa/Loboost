'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { PlanListRow } from '@/app/(coach)/coach/library/plans/queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'

export default function AssignPlanForm({
  clientId,
  clientName,
  templates,
  hasActivePlan,
  setupError,
}: {
  clientId: string
  clientName: string
  templates: PlanListRow[]
  hasActivePlan?: boolean
  setupError?: 'template_missing'
}) {
  const router = useRouter()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const canAssign = !!selectedPlanId

  const saveButton = (
    <button
      type="button"
      disabled={!canAssign}
      aria-label={canAssign ? 'Continuar con la configuración' : 'Seleccioná un plan para continuar'}
      onClick={() => {
        if (selectedPlanId) {
          router.push(`/coach/clients/${clientId}/assign/setup?templateId=${selectedPlanId}`)
        }
      }}
      style={{
        flexShrink: 0,
        width: 38,
        height: 38,
        padding: 0,
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: canAssign ? '#B5F23D' : '#3D4047',
        cursor: canAssign ? 'pointer' : 'not-allowed',
      }}
    >
      <Check size={21} strokeWidth={2.5} color={canAssign ? '#0A0A0A' : '#6B7280'} aria-hidden />
    </button>
  )

  if (hasActivePlan) {
    return (
      <>
        <FlowHeaderConfig
          title="Asignar plan"
          fallbackHref={`/coach/clients/${clientId}`}
        />
        <div
          style={{
            flex: 1,
            padding: '32px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
              Cliente
            </p>
            <p style={{ fontSize: 14, color: '#F0F0F0', margin: '4px 0 0', fontWeight: 600, textAlign: 'center' }}>
              {clientName}
            </p>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', textAlign: 'center', margin: 0 }}>
            Este cliente ya tiene un plan activo.
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            Para evitar reemplazos involuntarios, primero revisá o cerrá el plan actual desde el perfil del cliente.
          </p>
          <Link
            href={`/coach/clients/${clientId}`}
            style={{
              marginTop: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#B5F23D',
              textDecoration: 'none',
            }}
          >
            Volver al perfil del cliente
          </Link>
        </div>
      </>
    )
  }

  if (templates.length === 0) {
    return (
      <>
        <FlowHeaderConfig
          title="Asignar plan"
          fallbackHref={`/coach/clients/${clientId}`}
        />
        <div
          style={{
            flex: 1,
            padding: '32px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
              Cliente
            </p>
            <p style={{ fontSize: 14, color: '#F0F0F0', margin: '4px 0 0', fontWeight: 600, textAlign: 'center' }}>
              {clientName}
            </p>
          </div>
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            No tenés planes en tu biblioteca todavía.
          </p>
          <Link
            href="/coach/library/plans/new"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#B5F23D',
              textDecoration: 'none',
            }}
          >
            Crear un plan
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <FlowHeaderConfig
        title="Asignar plan"
        fallbackHref={`/coach/clients/${clientId}`}
        rightSlot={saveButton}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          padding: '4px 20px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: '10px 14px 4px',
            marginBottom: 2,
          }}
        >
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
            Cliente
          </p>
          <p style={{ fontSize: 14, color: '#F0F0F0', margin: '4px 0 0', fontWeight: 600, textAlign: 'center' }}>
            {clientName}
          </p>
        </div>

        {setupError === 'template_missing' && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(242, 82, 82, 0.08)',
              border: '1px solid rgba(242, 82, 82, 0.25)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 2,
            }}
          >
            <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45, margin: 0 }}>
              El plan seleccionado ya no está disponible. Elegí otro template para continuar.
            </p>
          </div>
        )}

        <div
          style={{
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
            Al asignar se crea una copia del plan para este cliente. Podés editarla desde su perfil sin modificar el original de biblioteca.
          </p>
        </div>

        {templates.map((plan) => {
          const selected = selectedPlanId === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(selected ? null : plan.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: selected ? 'rgba(181,242,61,0.06)' : '#111317',
                border: `1px solid ${selected ? '#B5F23D' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: 14,
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? '#B5F23D' : '#4B5563'}`,
                  backgroundColor: selected ? '#B5F23D' : 'transparent',
                  flexShrink: 0,
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#F0F0F0',
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {plan.name}
                  </p>
                  {plan.isIncomplete && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#F2994A',
                        backgroundColor: 'rgba(242,153,74,0.1)',
                        padding: '2px 7px',
                        borderRadius: 9999,
                        flexShrink: 0,
                      }}
                    >
                      Incompleto
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                  {plan.weeks} {plan.weeks === 1 ? 'semana' : 'semanas'}
                  {' · '}
                  {plan.weeks > 0 ? Math.round(plan.trainingDays / plan.weeks) : plan.trainingDays}{' '}
                  {(plan.weeks > 0 ? Math.round(plan.trainingDays / plan.weeks) : plan.trainingDays) === 1 ? 'día' : 'días'} / sem
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
