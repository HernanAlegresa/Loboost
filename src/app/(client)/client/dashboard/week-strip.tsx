'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import type { WeekStripDay, WeekStripDayStatus } from '@/features/training/types'
import ClientWeekHeatmapInfoSheet from './client-week-heatmap-info-sheet'

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const INFO_COLOR = 'rgba(86, 197, 250, 0.72)'

type DotConfig = { bg: string; border: string; shadow?: string }

const DOT_CONFIG: Record<WeekStripDayStatus, DotConfig> = {
  completed: {
    bg: 'rgba(181, 242, 61, 0.35)',
    border: 'rgba(181, 242, 61, 0.85)',
  },
  in_progress: {
    bg: 'rgba(242, 153, 74, 0.32)',
    border: 'rgba(242, 153, 74, 0.9)',
  },
  today: {
    bg: 'rgba(181, 242, 61, 0.12)',
    border: 'rgba(181, 242, 61, 0.85)',
    shadow: '0 0 0 1px #B5F23D',
  },
  past_missed: {
    bg: 'rgba(245, 158, 11, 0.28)',
    border: 'rgba(245, 158, 11, 0.8)',
  },
  upcoming: {
    bg: 'rgba(229, 231, 235, 0.12)',
    border: 'rgba(229, 231, 235, 0.3)',
  },
  rest: { bg: 'transparent', border: 'transparent' },
}

function DotCell({ status }: { status: WeekStripDayStatus }) {
  if (status === 'rest') {
    return (
      <div style={{ width: 24, height: 24, position: 'relative', flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 12, height: 2, backgroundColor: '#374151', borderRadius: 9999,
          transform: 'translate(-50%, -50%) rotate(45deg)',
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 12, height: 2, backgroundColor: '#374151', borderRadius: 9999,
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        }} />
      </div>
    )
  }
  const c = DOT_CONFIG[status]
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 9999,
        flexShrink: 0,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        boxSizing: 'border-box',
        ...(c.shadow ? { boxShadow: c.shadow } : {}),
      }}
    />
  )
}

export default function WeekStrip({
  days,
  trainingHref,
  currentWeek,
}: {
  days: WeekStripDay[]
  trainingHref: string | null
  currentWeek: number
}) {
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <>
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Header: "ESTA SEMANA" + ⓘ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px 8px',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#B5F23D',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Esta semana
          </span>
          <button
            type="button"
            aria-label="Información del mapa semanal"
            onClick={() => setInfoOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              lineHeight: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Info size={16} strokeWidth={2.3} color={INFO_COLOR} aria-hidden />
          </button>
        </div>

        {/* Heatmap: día labels + dots en columnas */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '10px 8px 14px',
          }}
        >
          {days.map((d) => {
            const label = DAY_LABELS[d.dayOfWeek] ?? ''
            const isToday = d.status === 'today' || d.status === 'in_progress'
            const dot = <DotCell status={d.status} />

            let dotNode: React.ReactNode
            if (d.status === 'in_progress' && trainingHref) {
              dotNode = (
                <Link href={trainingHref} style={{ lineHeight: 0, display: 'flex' }}>
                  {dot}
                </Link>
              )
            } else if (d.status === 'past_missed' && d.clientPlanDayId) {
              dotNode = (
                <Link
                  href={`/client/plan/${currentWeek}/${d.clientPlanDayId}`}
                  style={{ lineHeight: 0, display: 'flex' }}
                >
                  {dot}
                </Link>
              )
            } else {
              dotNode = dot
            }

            return (
              <div
                key={d.dayOfWeek}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? '#B5F23D' : '#6B7280',
                    letterSpacing: '0.02em',
                  }}
                >
                  {label}
                </span>
                {dotNode}
              </div>
            )
          })}
        </div>
      </div>

      <ClientWeekHeatmapInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
