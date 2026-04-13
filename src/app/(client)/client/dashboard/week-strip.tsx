import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { WeekStripDay } from '@/features/training/types'

const LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function cellStyle(status: WeekStripDay['status']): CSSProperties {
  if (status === 'completed') {
    return {
      color: '#B5F23D',
      fontWeight: 700,
      fontSize: 13,
    }
  }
  if (status === 'in_progress') {
    return { color: '#F2994A', fontWeight: 700, fontSize: 14 }
  }
  if (status === 'today') {
    return {
      color: '#B5F23D',
      fontWeight: 700,
      fontSize: 14,
      boxShadow: '0 0 0 2px rgba(181,242,61,0.5)',
    }
  }
  if (status === 'past_missed') {
    return { color: '#F0F0F0', fontSize: 12 }
  }
  if (status === 'rest') {
    return { color: '#2A2D34', fontSize: 11 }
  }
  return { color: '#F0F0F0', fontSize: 12 }
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
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 4,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 12,
        padding: '10px 8px',
      }}
    >
      {days.map((d) => {
        const label = LABELS[d.dayOfWeek] ?? ''
        const sym =
          d.status === 'completed'
            ? '✓'
            : d.status === 'in_progress'
              ? '●'
              : d.status === 'today'
                ? '●'
                : d.status === 'rest'
                  ? '—'
                  : '○'
        const isTrainingDay = d.status !== 'rest'
        const inner = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: isTrainingDay ? '#B5F23D' : '#6B7280',
                fontWeight: isTrainingDay ? 700 : 600,
              }}
            >
              {label}
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  d.status === 'today'
                    ? 'rgba(181,242,61,0.12)'
                    : d.status === 'in_progress'
                      ? 'rgba(242,153,74,0.12)'
                      : 'transparent',
                ...cellStyle(d.status),
              }}
            >
              {sym}
            </div>
          </div>
        )

        if (d.status === 'in_progress' && trainingHref) {
          return (
            <Link
              key={d.dayOfWeek}
              href={trainingHref}
              style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
            >
              {inner}
            </Link>
          )
        }

        if (d.status === 'past_missed' && d.clientPlanDayId) {
          return (
            <Link
              key={d.dayOfWeek}
              href={`/client/plan/${currentWeek}/${d.clientPlanDayId}`}
              style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
            >
              {inner}
            </Link>
          )
        }

        return (
          <div key={d.dayOfWeek} style={{ flex: 1, minWidth: 0 }}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
