'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ClientPlanViewData, PlanDayWithStatus } from '@/features/training/types'

const DAY_FULL = [
  '',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
]

function formatDateNumeric(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

function DayStatusIcon({ status }: { status: PlanDayWithStatus['status'] }) {
  if (status === 'completed') {
    return <span style={{ fontSize: 16, color: '#B5F23D' }}>✓</span>
  }
  if (status === 'in_progress') {
    return (
      <span style={{ fontSize: 12, color: '#F2994A', fontWeight: 700 }}>●</span>
    )
  }
  if (status === 'today') {
    return (
      <span style={{ fontSize: 12, color: '#B5F23D', fontWeight: 700 }}>●</span>
    )
  }
  if (status === 'past_missed') {
    return <span style={{ fontSize: 12, color: '#F59E0B' }}>○</span>
  }
  return <span style={{ fontSize: 14, color: '#374151', fontWeight: 700 }}>—</span>
}

export default function PlanView({ data }: { data: ClientPlanViewData }) {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(data.currentWeek)

  const week = data.weeksByNumber.find((w) => w.weekNumber === currentWeek)
  const days = week?.days ?? []

  function formatDateRange(): string {
    if (days.length === 0) return ''
    const first = days[0]!.dateISO
    const last = days[days.length - 1]!.dateISO
    return `${formatDateNumeric(first)} – ${formatDateNumeric(last)}`
  }

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p
          style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}
        >
          {data.planName}
        </p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          {formatDateNumeric(data.startDate)}
          {' → '}
          {formatDateNumeric(data.endDate)}
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            {data.completedSessions} de {data.totalTrainingDays} entrenamientos
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B5F23D' }}>
            {data.progressPct}%
          </p>
        </div>
        <div
          style={{
            backgroundColor: '#1F2227',
            borderRadius: 9999,
            height: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${data.progressPct}%`,
              backgroundColor: '#B5F23D',
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 12,
          padding: '10px 16px',
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
          disabled={currentWeek === 1}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentWeek === 1 ? 'not-allowed' : 'pointer',
            color: currentWeek === 1 ? '#374151' : '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F0' }}>
            Semana {currentWeek} de {data.weeks}
          </p>
          {formatDateRange() && (
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              {formatDateRange()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCurrentWeek((w) => Math.min(data.weeks, w + 1))}
          disabled={currentWeek === data.weeks}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentWeek === data.weeks ? 'not-allowed' : 'pointer',
            color: currentWeek === data.weeks ? '#374151' : '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {days.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: '#4B5563',
              textAlign: 'center',
              padding: 20,
            }}
          >
            No hay días de entrenamiento esta semana.
          </p>
        ) : (
          days.map((day) => (
            <button
              key={day.clientPlanDayId}
              type="button"
              onClick={() =>
                router.push(`/client/plan/${day.weekNumber}/${day.clientPlanDayId}`)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#111317',
                border: `1px solid ${
                  day.status === 'completed'
                    ? 'rgba(181,242,61,0.25)'
                    : day.status === 'today'
                      ? 'rgba(181,242,61,0.4)'
                      : day.status === 'in_progress'
                        ? 'rgba(242,153,74,0.3)'
                        : day.status === 'past_missed'
                          ? 'rgba(245,158,11,0.25)'
                          : '#1F2227'
                }`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      day.status === 'completed'
                        ? '#B5F23D'
                        : day.status === 'today'
                          ? '#F0F0F0'
                          : day.status === 'upcoming'
                            ? '#6B7280'
                            : '#9CA3AF',
                  }}
                >
                  {DAY_FULL[day.dayOfWeek]}
                  {day.status === 'today' && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: '#B5F23D',
                        fontWeight: 700,
                      }}
                    >
                      HOY
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {formatDateNumeric(day.dateISO)}
                </p>
              </div>
              <DayStatusIcon status={day.status} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
