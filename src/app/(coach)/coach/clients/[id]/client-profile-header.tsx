import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const STATUS_CONFIG = {
  active: { label: 'Al día', color: '#22C55E' },
  warning: { label: 'Atención', color: '#F2994A' },
  critical: { label: 'Crítico', color: '#F25252' },
} as const

type Props = {
  fullName: string
  goal: string | null
  statusColor: 'active' | 'warning' | 'critical'
}

export default function ClientProfileHeader({ fullName, goal, statusColor }: Props) {
  const { label, color } = STATUS_CONFIG[statusColor]

  return (
    <div
      style={{
        backgroundColor: '#0A0A0A',
        borderBottom: '1px solid #1F2227',
        padding: '12px 20px',
        display: 'grid',
        gridTemplateColumns: '44px 1fr 44px',
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

      <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span
          style={{
            flexShrink: 0,
            color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textAlign: 'right',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
