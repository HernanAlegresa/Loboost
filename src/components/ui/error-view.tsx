'use client'

interface ErrorViewProps {
  title?: string
  message?: string
  onReset?: () => void
}

export default function ErrorView({
  title = 'Algo salió mal',
  message = 'Ocurrió un error inesperado. Podés intentar de nuevo.',
  onReset,
}: ErrorViewProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px',
        gap: 16,
        minHeight: 300,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        ⚠
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0', textAlign: 'center', margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
        {message}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          style={{
            marginTop: 8,
            backgroundColor: '#B5F23D',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  )
}
