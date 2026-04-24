import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'

type Props = {
  clientId: string
  fullName: string
  goal: string | null
}

export default function ClientProfileHeader({ clientId, fullName, goal }: Props) {
  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        padding: '12px 20px',
        display: 'grid',
        gridTemplateColumns: '44px 1fr auto',
        alignItems: 'center',
        columnGap: 12,
        flexShrink: 0,
      }}
    >
      <Link
        href="/coach/clients"
        aria-label="Volver a clientes"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          color: '#B5F23D',
          textDecoration: 'none',
          width: 44,
          height: 44,
        }}
      >
        <ChevronLeft size={24} />
      </Link>

      <div style={{ minWidth: 0, textAlign: 'center' }}>
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#F0F0F0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {fullName}
        </p>
        <p
          style={{
            fontSize: 13,
            color: '#6B7280',
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {goal ?? 'Sin objetivo definido'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Link
          href={`/coach/clients/${clientId}/edit`}
          aria-label="Editar datos del cliente"
          title="Editar datos del cliente"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F1014',
            border: '1px solid #1F2227',
            borderRadius: 9999,
            color: '#9CA3AF',
            textDecoration: 'none',
          }}
        >
          <Pencil size={14} />
        </Link>
      </div>
    </div>
  )
}
