'use client'

import { useState, useTransition } from 'react'
import { completeSessionAction } from '@/features/training/actions/complete-session'
import { SAFE_AREA_TOP, SAFE_AREA_BOTTOM } from '@/lib/ui/safe-area'

type Props = {
  sessionId: string
  onComplete: () => void
  onSkip: () => void
}

const T = {
  bg: '#0A0A0A',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

const ENERGY_LABELS: Record<number, string> = {
  1: '💀 Agotado',
  2: '😴 Bajo',
  3: '😐 Normal',
  4: '💪 Bien',
  5: '🔥 Excelente',
}

const SORENESS_LABELS: Record<number, string> = {
  1: '🔴 Mucho dolor',
  2: '🟠 Bastante',
  3: '🟡 Algo',
  4: '🟢 Poco',
  5: '✅ Sin dolor',
}

export default function SessionCheckinModal({ sessionId, onComplete, onSkip }: Props) {
  const [isPending, startTransition] = useTransition()
  const [rpe, setRpe] = useState(7)
  const [energy, setEnergy] = useState(3)
  const [soreness, setSoreness] = useState(3)

  function handleConfirm() {
    startTransition(async () => {
      await completeSessionAction(sessionId, rpe, undefined, energy, undefined, soreness)
      onComplete()
    })
  }

  function handleSkip() {
    startTransition(async () => {
      await completeSessionAction(sessionId)
      onSkip()
    })
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: T.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          paddingTop: `calc(20px + ${SAFE_AREA_TOP})`,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
          borderBottom: `1px solid ${T.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>
          ¿Cómo te sentís?
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>
          Rápido — después de este entrenamiento
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.secondary }}>
              ESFUERZO PERCIBIDO (RPE)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.lime }}>
              {rpe}/10
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            style={{ width: '100%', accentColor: T.lime }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.secondary }}>
              ENERGÍA
            </p>
            <p style={{ margin: 0, fontSize: 14, color: T.text }}>
              {ENERGY_LABELS[energy]}
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            style={{ width: '100%', accentColor: T.lime }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.secondary }}>
              DOLOR MUSCULAR
            </p>
            <p style={{ margin: 0, fontSize: 14, color: T.text }}>
              {SORENESS_LABELS[soreness]}
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={soreness}
            onChange={(e) => setSoreness(Number(e.target.value))}
            style={{ width: '100%', accentColor: T.lime }}
          />
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: `16px 20px calc(16px + ${SAFE_AREA_BOTTOM})`,
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backgroundColor: T.bg,
        }}
      >
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          style={{
            width: '100%',
            height: 52,
            background: isPending
              ? 'rgba(181,242,61,0.35)'
              : `linear-gradient(180deg, ${T.lime} 0%, #9FD82E 100%)`,
            border: 'none',
            borderRadius: 14,
            color: '#0A0A0A',
            fontWeight: 900,
            fontSize: 16,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Guardar y salir'}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          style={{
            width: '100%',
            height: 40,
            background: 'transparent',
            border: 'none',
            color: T.muted,
            fontSize: 13,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
