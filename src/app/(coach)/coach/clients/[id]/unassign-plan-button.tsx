'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { unassignClientPlanAction } from '@/features/plans/actions/unassign-client-plan'

export default function UnassignPlanButton({ clientPlanId }: { clientPlanId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUnassign() {
    startTransition(async () => {
      const result = await unassignClientPlanAction(clientPlanId)
      if (result.success) {
        router.refresh()
      } else {
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          onClick={handleUnassign}
          disabled={isPending}
          style={{
            minHeight: 30,
            borderRadius: 20,
            border: 'none',
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
            color: '#F0F0F0',
            fontSize: 12,
            fontWeight: 600,
            padding: '0 10px',
            cursor: isPending ? 'default' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Desasignando…' : 'Sí, desasignar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          style={{
            minHeight: 30,
            borderRadius: 20,
            border: 'none',
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            fontWeight: 400,
            padding: '0 8px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        minHeight: 30,
        minWidth: 90,
        borderRadius: 20,
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        cursor: 'pointer',
      }}
    >
      Desasignar
    </button>
  )
}
