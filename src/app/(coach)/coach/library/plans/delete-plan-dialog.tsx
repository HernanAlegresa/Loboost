'use client'

type Props = {
  planName: string
  open: boolean
  isPending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export default function DeletePlanDialog({
  planName,
  open,
  isPending,
  error,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-plan-title"
      onClick={() => {
        if (!isPending) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: '16px 16px 0 0',
          padding: '20px 20px 24px',
          marginBottom: 64,
        }}
      >
        <p id="delete-plan-title" style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
          ¿Eliminar plantilla de plan?
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
          Se eliminará <span style={{ color: '#F0F0F0', fontWeight: 600 }}>{planName}</span> y sus
          días/ejercicios del template. Esto no borra planes ya asignados a clientes.
        </p>
        {error && (
          <p style={{ fontSize: 13, color: '#F25252', marginTop: 12, lineHeight: 1.45 }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#6B7280',
              background: 'none',
              border: 'none',
              cursor: isPending ? 'default' : 'pointer',
              padding: '10px 14px',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#F0F0F0',
              backgroundColor: isPending ? '#7A2C2C' : '#F25252',
              border: 'none',
              borderRadius: 10,
              cursor: isPending ? 'not-allowed' : 'pointer',
              padding: '10px 16px',
            }}
          >
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
