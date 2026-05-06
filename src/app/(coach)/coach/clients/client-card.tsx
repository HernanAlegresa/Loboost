'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Avatar from '@/components/ui/avatar'
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import type { ClientStatus } from '@/features/clients/types/client-status'

type Props = {
  clientId: string
  fullName: string
  status: ClientStatus
  planName?: string | null
}

export default function ClientCard({ clientId, fullName, status, planName }: Props) {
  const accent = CLIENT_STATUS_CONFIG[status].color

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      whileTap={{ scale: 0.975 }}
      whileHover={{ scale: 1.015 }}
    >
      <Link href={`/coach/clients/${clientId}`} style={{ textDecoration: 'none' }}>
        <div
          style={{
            background: 'linear-gradient(165deg, #12161C 0%, #0F1217 100%)',
            border: '1px solid transparent',
            borderLeft: `3px solid ${accent}`,
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '2px 4px 8px rgba(0,0,0,0.14)',
          }}
        >
          <div style={{ marginLeft: 6 }}>
            <Avatar fullName={fullName} ringColor="#FFFFFF" size="md" />
          </div>
          <div style={{ flex: 1, minWidth: 0, marginLeft: 10, padding: '2px 0' }}>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#F0F0F0',
                lineHeight: 1.05,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {fullName}
            </p>
            <p
              style={{
                fontSize: 12,
                color: '#6B7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: '6px 0 0',
              }}
            >
              {planName ?? 'Sin plan asignado'}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
