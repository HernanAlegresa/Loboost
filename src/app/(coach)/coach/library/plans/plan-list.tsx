'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ArrowRight } from 'lucide-react'
import { deletePlanAction } from '@/features/plans/actions/delete-plan'
import type { PlanListRow } from './queries'
import DeletePlanDialog from './delete-plan-dialog'

export default function PlanList({ plans }: { plans: PlanListRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialogPlan, setDialogPlan] = useState<PlanListRow | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogPlan) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        setDialogPlan(null)
        setDialogError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogPlan, isPending])

  function openDelete(p: PlanListRow) {
    setDialogError(null)
    setDialogPlan(p)
  }

  function closeDelete() {
    if (isPending) return
    setDialogPlan(null)
    setDialogError(null)
  }

  function confirmDelete() {
    if (!dialogPlan) return
    setPendingId(dialogPlan.id)
    setDialogError(null)
    startTransition(async () => {
      const result = await deletePlanAction(dialogPlan.id)
      setPendingId(null)
      if ('error' in result && result.error) {
        setDialogError(result.error)
        return
      }
      setDialogPlan(null)
      router.refresh()
    })
  }

  if (plans.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>Todavía no tenés plantillas</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
          Creá tu primera plantilla con el botón <span style={{ color: '#B5F23D' }}>+</span>. Después
          vas a poder asignarla a un cliente y se genera su plan personalizado en la base.
        </p>
      </div>
    )
  }

  return (
    <>
      <DeletePlanDialog
        open={dialogPlan !== null}
        planName={dialogPlan?.name ?? ''}
        isPending={isPending && pendingId === dialogPlan?.id}
        error={dialogError}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: isPending && pendingId === p.id ? 0.55 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#F0F0F0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {p.weeks} semanas · {p.trainingDays} {p.trainingDays === 1 ? 'día' : 'días'} / semana
              </p>
            </div>

            <Link
              href={`/coach/library/plans/${p.id}/assign`}
              aria-label={`Asignar plan ${p.name}`}
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid #2A2D34',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: '#B5F23D',
              }}
            >
              <ArrowRight size={18} />
            </Link>

            <button
              type="button"
              disabled={isPending}
              onClick={() => openDelete(p)}
              aria-label={`Eliminar plantilla ${p.name}`}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: isPending ? 'default' : 'pointer',
                color: '#6B7280',
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
