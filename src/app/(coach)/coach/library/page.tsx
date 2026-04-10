import Link from 'next/link'

const CARD: React.CSSProperties = {
  backgroundColor: '#111317',
  border: '1px solid #1F2227',
  borderRadius: 14,
  padding: '18px 16px',
  textDecoration: 'none',
  color: '#F0F0F0',
  display: 'block',
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

export default function LibraryHubPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 20px 120px' }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>Librería</p>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 24 }}>
        Ejercicios y planes del coach
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/coach/library/exercises" style={CARD}>
          <p style={LABEL}>Ejercicios</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Biblioteca de ejercicios</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
            Crear, listar y eliminar ejercicios
          </p>
        </Link>

        <div
          style={
            {
              ...CARD,
              opacity: 0.55,
              cursor: 'not-allowed',
              pointerEvents: 'none',
            } as React.CSSProperties
          }
        >
          <p style={LABEL}>Planes</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Biblioteca de planes</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
            Próximo: plantillas y asignación (Grupo 3)
          </p>
        </div>
      </div>
    </div>
  )
}
