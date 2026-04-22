'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Avatar from '@/components/ui/avatar'

export type ClientHealthState = 'en_riesgo' | 'atrasado' | 'al_dia' | 'sin_plan'

const STATE_UI: Record<
  ClientHealthState,
  { accent: string }
> = {
  en_riesgo: { accent: '#F25252' },
  atrasado: { accent: '#F2994A' },
  al_dia: { accent: '#22C55E' },
  sin_plan: { accent: '#9CA3AF' },
}

type Props = {
  clientId: string
  fullName: string
  state: ClientHealthState
  completedThisWeek: number
  plannedDaysPerWeek: number
  planExpired?: boolean
  daysSinceLastSession?: number | null
}

export default function ClientCard({
  clientId,
  fullName,
  state,
  completedThisWeek,
  plannedDaysPerWeek,
  planExpired,
  daysSinceLastSession,
}: Props) {
  const stateUi = STATE_UI[state]
  const accent = stateUi.accent

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
            border: '1px solid #252A31',
            borderLeft: `3px solid ${accent}`,
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
          }}
        >
          <Avatar fullName={fullName} ringColor="#FFFFFF" size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: '#F0F0F0',
                lineHeight: 1.22,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {fullName}
            </p>
            {planExpired && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#F25252',
                  backgroundColor: 'rgba(242,82,82,0.1)',
                  border: '1px solid rgba(242,82,82,0.25)',
                  padding: '2px 7px',
                  borderRadius: 20,
                  letterSpacing: '0.05em',
                  display: 'inline-block',
                  marginTop: 4,
                }}
              >
                PLAN VENCIDO
              </span>
            )}
            {!planExpired &&
              daysSinceLastSession != null &&
              daysSinceLastSession >= 7 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#F2994A',
                    backgroundColor: 'rgba(242,153,74,0.1)',
                    border: '1px solid rgba(242,153,74,0.25)',
                    padding: '2px 7px',
                    borderRadius: 20,
                    letterSpacing: '0.05em',
                    display: 'inline-block',
                    marginTop: 4,
                  }}
                >
                  {daysSinceLastSession}D SIN ENTRENAR
                </span>
              )}
          </div>
          <div
            style={{
              flexShrink: 0,
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: accent,
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {completedThisWeek}/{plannedDaysPerWeek}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', lineHeight: 1.2 }}>
              esta semana
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
