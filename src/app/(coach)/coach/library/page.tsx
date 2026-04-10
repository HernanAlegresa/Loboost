import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const cardBase: CSSProperties = {
  backgroundColor: '#111317',
  border: '1px solid #1F2227',
  borderRadius: 16,
  padding: '18px 16px',
  textDecoration: 'none',
  color: '#F0F0F0',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  transition: 'border-color 0.15s, background-color 0.15s, transform 0.12s',
}

const kicker: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6B7280',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 6,
}

export default function LibraryHubPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 20px 120px' }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>Biblioteca</p>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 24 }}>
        Ejercicios y planes para armar entrenamientos
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link
          href="/coach/library/exercises"
          style={cardBase}
          className="library-hub-card"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={kicker}>Ejercicios</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#B5F23D', lineHeight: 1.3 }}>
              Biblioteca de ejercicios
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.45 }}>
              Creá y organizá movimientos para tus planes
            </p>
          </div>
          <ChevronRight size={22} color="#B5F23D" style={{ flexShrink: 0 }} aria-hidden />
        </Link>

        <Link href="/coach/library/plans" style={cardBase} className="library-hub-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={kicker}>Planes</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#B5F23D', lineHeight: 1.3 }}>
              Biblioteca de planes
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.45 }}>
              Diseñá semanas y asignalos a tus clientes
            </p>
          </div>
          <ChevronRight size={22} color="#B5F23D" style={{ flexShrink: 0 }} aria-hidden />
        </Link>
      </div>
      <style>{`
        .library-hub-card:hover {
          border-color: #B5F23D;
          background-color: #14171c;
        }
        .library-hub-card:active {
          transform: scale(0.99);
        }
      `}</style>
    </div>
  )
}
