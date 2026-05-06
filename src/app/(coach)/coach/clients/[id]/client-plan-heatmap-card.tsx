'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekTrainingData } from './actions'
import type { ActivePlanSummary, TrainingWeekData, DayStatus } from '@/features/clients/types'
import HeatmapCellDot from '../../dashboard/heatmap-cell-dot'
import type { WeeklyHeatmapCell } from '../../dashboard/weekly-heatmap-types'

const DAY_SHORT_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getTodayMondayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

function mapStatusToHeatmap(dayStatus: DayStatus): WeeklyHeatmapCell['kind'] {
  if (dayStatus === 'completed') return 'completed'
  if (dayStatus === 'in_progress') return 'in_progress'
  if (dayStatus === 'past_missed') return 'missed'
  if (dayStatus === 'rest') return 'rest'
  return 'upcoming'
}

function buildDayHeaderLabel(dayOfWeek: number, dateISO: string): string {
  const dayName = DAY_SHORT_NAMES[dayOfWeek - 1] ?? ''
  const dayOfMonth = Number(dateISO.slice(8, 10))
  return `${dayName} ${dayOfMonth}`
}

type Props = {
  activePlan: ActivePlanSummary | null
  initialWeekData: TrainingWeekData | null
  clientId: string
}

export default function ClientPlanHeatmapCard({ activePlan, initialWeekData, clientId }: Props) {
  const [weekData, setWeekData] = useState<TrainingWeekData | null>(initialWeekData)
  const [isPending, startTransition] = useTransition()

  if (!activePlan || !weekData) {
    return (
      <div>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563', margin: 0 }}>
            Sin plan activo - no hay semanas para visualizar.
          </p>
        </div>
      </div>
    )
  }

  const plan = activePlan
  const data = weekData
  const canGoPrev = data.weekNumber > 1
  const canGoNext = data.weekNumber < data.totalWeeks
  const isCurrentWeek = data.weekNumber === plan.currentWeek
  const todayIndex = isCurrentWeek ? getTodayMondayIndex() : -1

  function navigateWeek(delta: number) {
    const nextWeek = data.weekNumber + delta
    if (nextWeek < 1 || nextWeek > data.totalWeeks) return
    startTransition(async () => {
      const nextData = await getWeekTrainingData(
        plan.id,
        nextWeek,
        plan.startDate,
        plan.weeks,
        clientId
      )
      setWeekData(nextData)
    })
  }

  return (
    <div>
      <div
        style={{
          background: 'transparent',
          border: 'none',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              width: '100%',
              maxWidth: 270,
              paddingBottom: 4,
            }}
          >
            <button
              type="button"
              onClick={() => navigateWeek(-1)}
              disabled={!canGoPrev || isPending}
              aria-label="Semana anterior"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: canGoPrev && !isPending ? '#B5F23D' : '#2A2D34',
                cursor: canGoPrev && !isPending ? 'pointer' : 'default',
              }}
            >
              <ChevronLeft size={30} strokeWidth={3.8} />
            </button>

            <div
              style={{
                textAlign: 'center',
                minWidth: 0,
                flex: 1,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  color: '#F0F0F0',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Semana {data.weekNumber} de {data.totalWeeks}
              </p>
              {data.weekNumber === plan.currentWeek ? (
                <span
                  style={{
                    position: 'absolute',
                    marginTop: 6,
                    left: '50%',
                    top: 'calc(50% + 10px)',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#B5F23D',
                    borderBottom: '1px solid #B5F23D',
                    borderRadius: 4,
                    padding: '4px 6px',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Actual
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => navigateWeek(1)}
              disabled={!canGoNext || isPending}
              aria-label="Semana siguiente"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: canGoNext && !isPending ? '#B5F23D' : '#2A2D34',
                cursor: canGoNext && !isPending ? 'pointer' : 'default',
              }}
            >
              <ChevronRight size={30} strokeWidth={3.8} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '10px 14px 14px',
            opacity: isPending ? 0.45 : 1,
            transition: 'opacity 0.2s ease',
            backgroundColor: 'transparent',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 0,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginBottom: 8,
            }}
          >
            {data.days.map((day, index) => (
              <span
                key={`label-${day.dayOfWeek}-${day.date}`}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: index === todayIndex ? 800 : 700,
                  letterSpacing: '0.04em',
                  color: index === todayIndex ? '#B5F23D' : '#6B7280',
                  lineHeight: 1.15,
                  whiteSpace: 'pre-line',
                }}
              >
                {buildDayHeaderLabel(day.dayOfWeek, day.date).replace(' ', '\n')}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              justifyItems: 'center',
            }}
          >
            {data.days.map((day) => (
              <HeatmapCellDot
                key={`${data.weekNumber}-${day.dayOfWeek}`}
                cell={{
                  kind: mapStatusToHeatmap(day.status),
                  isToday: isCurrentWeek && day.dayOfWeek === todayIndex + 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
