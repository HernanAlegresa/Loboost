'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronRight } from 'lucide-react'
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: 'rgba(181, 242, 61, 0.08)',
            border: '1px solid rgba(181, 242, 61, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          📋
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
          Sin planes creados
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
          Creá tu primer plan de entrenamiento{'\n'}para asignárselo a tus clientes.
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 16,
              padding: '16px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: isPending && pendingId === p.id ? 0.55 : 1,
            }}
          >
            <Link
              href={`/coach/library/plans/${p.id}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#B5F23D',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {p.name}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '6px 0 0', lineHeight: 1.4 }}>
                  {p.weeks} {p.weeks === 1 ? 'semana' : 'semanas'} · {p.trainingDays}{' '}
                  {p.trainingDays === 1 ? 'día' : 'días'} / semana
                </p>
              </div>
              <ChevronRight size={24} strokeWidth={2.6} color="#F0F0F0" style={{ flexShrink: 0 }} aria-hidden />
            </Link>

            <button
              type="button"
              disabled={isPending}
              onClick={() => openDelete(p)}
              aria-label={`Eliminar plan ${p.name}`}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                padding: 8,
                cursor: isPending ? 'default' : 'pointer',
                color: '#F25252',
              }}
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
