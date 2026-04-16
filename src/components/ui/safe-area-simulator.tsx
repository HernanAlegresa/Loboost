'use client'

import { useEffect } from 'react'

/**
 * SafeAreaSimulator — solo activo en desarrollo.
 *
 * Sobrescribe las CSS custom properties --sat / --sab en <html> para simular
 * los insets reales de un iPhone, permitiendo que Responsively y cualquier
 * browser de escritorio muestren el layout exactamente como en un dispositivo real.
 *
 * Valores por defecto: iPhone 14 / 15 (notch clásico y Dynamic Island comparten
 * la misma zona de exclusión para el contenido web).
 *   --sat: 47px  (status bar + notch/Dynamic Island)
 *   --sab: 34px  (home indicator)
 *
 * Desactivar en .env.local:
 *   NEXT_PUBLIC_SIMULATE_SAFE_AREAS=false
 */

const SAT = process.env.NEXT_PUBLIC_SIMULATE_SAT ?? '47px'
const SAB = process.env.NEXT_PUBLIC_SIMULATE_SAB ?? '34px'
const ENABLED = process.env.NEXT_PUBLIC_SIMULATE_SAFE_AREAS !== 'false'

export default function SafeAreaSimulator() {
  // Solo corre en desarrollo
  if (process.env.NODE_ENV !== 'development') return null
  if (!ENABLED) return null

  return <SafeAreaSimulatorInner />
}

function SafeAreaSimulatorInner() {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--sat', SAT)
    root.style.setProperty('--sab', SAB)

    return () => {
      root.style.removeProperty('--sat')
      root.style.removeProperty('--sab')
    }
  }, [])

  return (
    <>
      {/* Banda superior — muestra el área del notch/Dynamic Island */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: SAT,
          background: 'rgba(181, 242, 61, 0.08)',
          borderBottom: '1px solid rgba(181, 242, 61, 0.3)',
          zIndex: 9999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 2,
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(181,242,61,0.6)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          safe-area-top {SAT}
        </span>
      </div>

      {/* Banda inferior — muestra el área del home indicator */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: SAB,
          background: 'rgba(181, 242, 61, 0.08)',
          borderTop: '1px solid rgba(181, 242, 61, 0.3)',
          zIndex: 9999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 2,
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(181,242,61,0.6)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          safe-area-bottom {SAB}
        </span>
      </div>
    </>
  )
}
