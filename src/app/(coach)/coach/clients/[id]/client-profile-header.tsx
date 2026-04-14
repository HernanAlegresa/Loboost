import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import Avatar from '@/components/ui/avatar'

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
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'flex-start',
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

      <Avatar fullName={fullName} ringColor={color} size="md" />

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
        <p
          style={{
            fontSize: 12,
            color: '#6B7280',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {goal ?? 'Sin objetivo definido'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 0 4px ${color}22`,
          }}
        />
        <span
          style={{
            flexShrink: 0,
            color,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
