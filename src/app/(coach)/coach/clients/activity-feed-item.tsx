'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

type Props = {
  clientId: string
  fullName: string
  eventText: string
  timeLabel: string
}

export default function ActivityFeedItem({ clientId, fullName, eventText, timeLabel }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      whileTap={{ scale: 0.985 }}
    >
      <Link href={`/coach/clients/${clientId}`} style={{ display: 'block', textDecoration: 'none' }}>
        <article
          style={{
            borderRadius: 14,
            border: '1px solid #1F2227',
            backgroundColor: '#111317',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            transition: 'border-color 140ms ease, transform 140ms ease',
          }}
        >
          <span
            aria-hidden
            style={{
              marginTop: 6,
              width: 7,
              height: 7,
              borderRadius: 9999,
              backgroundColor: '#B5F23D',
              boxShadow: '0 0 0 4px rgba(181,242,61,0.12)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.35,
                color: '#F0F0F0',
              }}
            >
              <span style={{ fontWeight: 600 }}>{fullName}</span> {eventText}
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#6B7280' }}>{timeLabel}</p>
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
