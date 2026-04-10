import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import Avatar from '@/components/ui/avatar'

const STATUS_CONFIG = {
  active: { label: 'Activo', color: '#B5F23D' },
  warning: { label: 'Atencion', color: '#F2994A' },
  critical: { label: 'Inactivo', color: '#F25252' },
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}
    >
      <Link
        href="/coach/clients"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#6B7280',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={22} />
      </Link>

      <Avatar fullName={fullName} size="md" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#F0F0F0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fullName}
        </p>
        {goal && (
          <p
            style={{
              fontSize: 12,
              color: '#6B7280',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {goal}
          </p>
        )}
      </div>

      <span
        style={{
          flexShrink: 0,
          backgroundColor: `${color}1A`,
          color,
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 9999,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
