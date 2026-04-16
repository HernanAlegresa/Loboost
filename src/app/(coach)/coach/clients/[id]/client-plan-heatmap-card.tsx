'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPlanFollowupStatusSummary, getWeekTrainingData } from './actions'
import type { PlanFollowupIssue, PlanFollowupStatusSummary } from './queries'
import type { ActivePlanSummary, TrainingWeekData, DayStatus } from '@/features/clients/types'
import HeatmapCellDot from '../../dashboard/heatmap-cell-dot'
import type { WeeklyHeatmapCell } from '../../dashboard/weekly-heatmap-types'

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const ALERT_LIST_LIMIT = 3

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

function formatIssue(issue: PlanFollowupIssue): string {
  return `Semana ${issue.weekNumber} · ${DAY_NAMES[issue.dayOfWeek - 1]}`
}

type Props = {
  activePlan: ActivePlanSummary | null
  initialWeekData: TrainingWeekData | null
  clientId: string
}

export default function ClientPlanHeatmapCard({ activePlan, initialWeekData, clientId }: Props) {
  const [weekData, setWeekData] = useState<TrainingWeekData | null>(initialWeekData)
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = useState<PlanFollowupStatusSummary | null>(null)
  const [isSummaryPending, setIsSummaryPending] = useState(false)

  if (!activePlan || !weekData) {
    return (
      <div>
        <p style={SECTION_TITLE}>Plan activo</p>
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
  const hasMissed = (summary?.missed.length ?? 0) > 0
  const hasInProgress = (summary?.inProgress.length ?? 0) > 0

  const visibleMissed = useMemo(
    () => summary?.missed.slice(0, ALERT_LIST_LIMIT) ?? [],
    [summary?.missed]
  )
  const visibleInProgress = useMemo(
    () => summary?.inProgress.slice(0, ALERT_LIST_LIMIT) ?? [],
    [summary?.inProgress]
  )

  useEffect(() => {
    let cancelled = false
    setIsSummaryPending(true)

    async function run() {
      const statusSummary = await getPlanFollowupStatusSummary(
        plan.id,
        plan.startDate,
        plan.weeks,
        plan.currentWeek,
        clientId
      )
      if (cancelled) return
      setSummary(statusSummary)
      setIsSummaryPending(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [plan.id, plan.startDate, plan.weeks, plan.currentWeek, clientId])

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
      <p style={SECTION_TITLE}>Plan activo</p>
      <div
        style={{
          background: 'linear-gradient(170deg, #12161C 0%, #0F1217 100%)',
          border: '1px solid #252A31',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid #1F2227',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            disabled={!canGoPrev || isPending}
            aria-label="Semana anterior"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid #2A2D34',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canGoPrev && !isPending ? '#9CA3AF' : '#2A2D34',
              cursor: canGoPrev && !isPending ? 'pointer' : 'default',
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: '#F0F0F0',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {plan.name}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6B7280' }}>
              Semana {data.weekNumber} de {data.totalWeeks}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateWeek(1)}
            disabled={!canGoNext || isPending}
            aria-label="Semana siguiente"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid #2A2D34',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canGoNext && !isPending ? '#9CA3AF' : '#2A2D34',
              cursor: canGoNext && !isPending ? 'pointer' : 'default',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '12px 14px 14px',
            opacity: isPending ? 0.45 : 1,
            transition: 'opacity 0.2s ease',
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
            {DAY_LABELS.map((label, index) => (
              <span
                key={label}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: index === todayIndex ? 800 : 700,
                  letterSpacing: '0.08em',
                  color: index === todayIndex ? '#B5F23D' : '#6B7280',
                  textTransform: 'uppercase',
                }}
              >
                {label}
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

        <div
          style={{
            borderTop: '1px solid #1A1D22',
            padding: '12px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {isSummaryPending ? (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid #252A31',
                backgroundColor: '#111317',
                padding: '10px 12px',
                fontSize: 12,
                color: '#6B7280',
              }}
            >
              Analizando alertas del plan...
            </div>
          ) : null}

          {!isSummaryPending && (hasMissed || hasInProgress) ? (
            hasMissed && hasInProgress ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  alignItems: 'stretch',
                  gap: 20,
                }}
              >
                <div style={{ paddingRight: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252', textAlign: 'center' }}>
                    Sesiones sin registrar
                  </p>
                  <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                    {visibleMissed.map((issue) => (
                      <div
                        key={`missed-${issue.weekNumber}-${issue.dayOfWeek}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 9999,
                            backgroundColor: '#F25252',
                            flexShrink: 0,
                          }}
                        />
                        <p style={{ margin: 0, fontSize: 12, color: '#F0F0F0' }}>{formatIssue(issue)}</p>
                      </div>
                    ))}
                    {(summary?.missed.length ?? 0) > ALERT_LIST_LIMIT ? (
                      <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                        +{(summary?.missed.length ?? 0) - ALERT_LIST_LIMIT} más
                      </p>
                    ) : null}
                  </div>
                </div>

                <div style={{ paddingLeft: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F2B01E', textAlign: 'center' }}>
                    Sesiones con datos faltantes
                  </p>
                  <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                    {visibleInProgress.map((issue) => (
                      <div
                        key={`in-progress-${issue.weekNumber}-${issue.dayOfWeek}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 9999,
                            backgroundColor: '#F2B01E',
                            flexShrink: 0,
                          }}
                        />
                        <p style={{ margin: 0, fontSize: 12, color: '#F0F0F0' }}>{formatIssue(issue)}</p>
                      </div>
                    ))}
                    {(summary?.inProgress.length ?? 0) > ALERT_LIST_LIMIT ? (
                      <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                        +{(summary?.inProgress.length ?? 0) - ALERT_LIST_LIMIT} más
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : hasMissed ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: 320 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F25252', textAlign: 'center' }}>
                  Sesiones sin registrar
                </p>
                <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                  {visibleMissed.map((issue) => (
                    <div
                      key={`missed-${issue.weekNumber}-${issue.dayOfWeek}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 9999,
                          backgroundColor: '#F25252',
                          flexShrink: 0,
                        }}
                      />
                      <p style={{ margin: 0, fontSize: 12, color: '#F0F0F0' }}>{formatIssue(issue)}</p>
                    </div>
                  ))}
                  {(summary?.missed.length ?? 0) > ALERT_LIST_LIMIT ? (
                    <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                      +{(summary?.missed.length ?? 0) - ALERT_LIST_LIMIT} más
                    </p>
                  ) : null}
                </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: 320 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F2B01E', textAlign: 'center' }}>
                  Sesiones con datos faltantes
                </p>
                <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                  {visibleInProgress.map((issue) => (
                    <div
                      key={`in-progress-${issue.weekNumber}-${issue.dayOfWeek}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 9999,
                          backgroundColor: '#F2B01E',
                          flexShrink: 0,
                        }}
                      />
                      <p style={{ margin: 0, fontSize: 12, color: '#F0F0F0' }}>{formatIssue(issue)}</p>
                    </div>
                  ))}
                  {(summary?.inProgress.length ?? 0) > ALERT_LIST_LIMIT ? (
                    <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                      +{(summary?.inProgress.length ?? 0) - ALERT_LIST_LIMIT} más
                    </p>
                  ) : null}
                </div>
                </div>
              </div>
            )
          ) : null}

          {!isSummaryPending && !hasMissed && !hasInProgress ? (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#22C55E', textAlign: 'center' }}>
              Al día
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
