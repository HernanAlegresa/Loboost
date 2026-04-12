'use client'

import type { WeekStripDay } from '@/features/training/types'

export default function MissedDaysBanner({ days }: { days: WeekStripDay[] }) {
  // Use device local date to avoid UTC/timezone mismatch on the server
  const todayISO = new Date().toLocaleDateString('en-CA') // returns YYYY-MM-DD in local tz

  const missedCount = days.filter(
    (d) =>
      d.status === 'past_missed' &&
      d.dateISO !== undefined &&
      d.dateISO < todayISO
  ).length

  if (missedCount === 0) return null

  return (
    <div
      style={{
        backgroundColor: 'rgba(242,153,74,0.12)',
        border: '1px solid rgba(242,153,74,0.35)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: '#F2994A' }}>
        {missedCount === 1
          ? 'Tenés 1 día sin registrar esta semana'
          : `Tenés ${missedCount} días sin registrar esta semana`}
      </p>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
        Tocá el círculo vacío{' '}
        <span style={{ fontWeight: 600 }}>○</span>{' '}
        en "Esta semana" para registrar los datos de ese día.
      </p>
    </div>
  )
}
