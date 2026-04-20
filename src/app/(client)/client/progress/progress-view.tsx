'use client'

import { useState } from 'react'
import type { ClientProgressData } from '@/features/training/types'

const T = {
  bg: '#0A0A0A',
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const

export default function ProgressView({
  data,
}: {
  data: ClientProgressData
  clientId: string
}) {
  const [tab, setTab] = useState<'prs' | 'body'>('prs')

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
          Mi progreso
        </h1>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 0' }}>
        {(['prs', 'body'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              height: 36,
              paddingLeft: 16,
              paddingRight: 16,
              borderRadius: 20,
              border: tab === t ? `1.5px solid ${T.lime}` : `1px solid ${T.border}`,
              backgroundColor: tab === t ? 'rgba(181,242,61,0.1)' : T.card,
              color: tab === t ? T.lime : T.secondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t === 'prs' ? 'Ejercicios' : 'Cuerpo'}
          </button>
        ))}
      </div>

      {tab === 'prs' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.prs.length === 0 && (
            <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              Todavía no hay datos de progreso. Completá tu primer entrenamiento.
            </p>
          )}
          {data.prs.map((pr) => (
            <div
              key={pr.exerciseId}
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>
                  {pr.exerciseName}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
                  {pr.muscleGroup} · {pr.totalCompletedSets} sets registrados
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {pr.bestWeightKg != null ? (
                  <>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.lime }}>
                      {pr.bestWeightKg} kg
                    </p>
                    {pr.bestRepsAtBestWeight != null && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>
                        × {pr.bestRepsAtBestWeight} reps
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Sin peso registrado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'body' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.bodyMeasurements.length === 0 && (
            <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              No hay mediciones corporales registradas todavía.
            </p>
          )}
          {[...data.bodyMeasurements].reverse().map((m, i) => (
            <div
              key={i}
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: T.secondary }}>
                {new Date(m.date).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
                {m.weightKg} kg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
