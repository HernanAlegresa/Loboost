'use client'

import { BarChart3, ChevronRight } from 'lucide-react'

type Props = {
  /** Misma altura mínima que las filas de `NavTile` en seguimiento (evita que el blur agrande la caja). */
  tileMinHeightPx?: number
}

/** Misma UI que `NavTile` en `client-progress-content`, sin navegación: blur + overlay “Próximamente”. */
export default function NavTileWeeklyLoadComingSoon({ tileMinHeightPx = 76 }: Props) {
  const h = tileMinHeightPx

  const tileBody = (
    <div
      style={{
        backgroundColor: '#111317',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minHeight: h,
        boxSizing: 'border-box',
        height: '100%',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: '#B5F23D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <BarChart3 size={20} color="#0A0A0A" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>Carga semanal</p>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0', lineHeight: 1.4 }}>
          Tonelaje e intensidad semana a semana
        </p>
      </div>
      <ChevronRight size={18} color="#B5F23D" strokeWidth={2.5} style={{ flexShrink: 0 }} />
    </div>
  )

  return (
    <div
      role="group"
      aria-label="Carga semanal. Próximamente disponible."
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: h,
        boxSizing: 'border-box',
        contain: 'layout paint',
      }}
    >
      <div
        style={{
          filter: 'blur(3px)',
          opacity: 0.88,
          pointerEvents: 'none',
          userSelect: 'none',
          minHeight: h,
          height: '100%',
          boxSizing: 'border-box',
        }}
        aria-hidden
      >
        {tileBody}
      </div>
      <div
        role="presentation"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(10,10,10,0.42)',
          cursor: 'not-allowed',
          touchAction: 'none',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#F0F0F0',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '0 12px',
            textShadow: '0 1px 8px rgba(0,0,0,0.65)',
          }}
        >
          Próximamente
        </span>
      </div>
    </div>
  )
}
