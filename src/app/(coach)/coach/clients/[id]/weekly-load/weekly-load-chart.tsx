'use client'

import { useMemo, useState } from 'react'
import type { WeeklyLoadPoint, MuscleWeekPoint } from '../progress-queries'
import { MUSCLE_GROUPS_ORDER } from '../progress-queries'
import { getWeekDateRange, formatDateRange } from '../date-utils'

type Metric = 'tonnage' | 'intensity' | 'sets'

const METRIC_CONFIG: Record<
  Metric,
  { label: string; unit: string; getValue: (w: WeeklyLoadPoint) => number | null }
> = {
  tonnage: {
    label: 'Tonelaje',
    unit: 'kg',
    getValue: (w) => (w.tonnageKg > 0 ? w.tonnageKg : null),
  },
  intensity: {
    label: 'Intensidad',
    unit: 'kg/serie',
    getValue: (w) => w.avgIntensityKg,
  },
  sets: {
    label: 'Series',
    unit: 'series',
    getValue: (w) => (w.completedSets > 0 ? w.completedSets : null),
  },
}

const METRIC_COLORS: Record<Metric, string> = {
  tonnage: '#F6AD55',
  intensity: '#63B3ED',
  sets: '#B5F23D',
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({
  data,
  metric,
  currentWeek,
  selectedWeek,
  onSelectWeek,
}: {
  data: WeeklyLoadPoint[]
  metric: Metric
  currentWeek: number
  selectedWeek: number
  onSelectWeek: (w: number) => void
}) {
  const { getValue } = METRIC_CONFIG[metric]
  const barColor = METRIC_COLORS[metric]
  const values = data.map((w) => getValue(w) ?? 0)
  const maxVal = Math.max(...values, 1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 128,
        padding: '0 0 8px',
        overflowX: 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
        msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
        touchAction: 'pan-x',
      }}
    >
      {data.map((week) => {
        const val = getValue(week)
        const pct = val !== null ? (val / maxVal) * 100 : 0
        const isCurrent = week.weekNumber === currentWeek
        const isSelected = week.weekNumber === selectedWeek
        const isFuture = week.weekNumber > currentWeek
        const hasData = val !== null && val > 0

        return (
          <button
            key={week.weekNumber}
            onClick={() => onSelectWeek(week.weekNumber)}
            aria-label={`Semana ${week.weekNumber}${isFuture ? ': semana futura' : `: ${val !== null ? `${val} ${METRIC_CONFIG[metric].unit}` : 'sin datos'}`}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              flex: '0 0 auto',
              minWidth: 36,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {/* Value label — hidden but space-preserving when null */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: hasData ? barColor : '#4B5563',
                lineHeight: 1,
                visibility: val !== null && !isFuture ? 'visible' : 'hidden',
              }}
            >
              {val !== null
                ? val >= 1000
                  ? `${(val / 1000).toFixed(1)}k`
                  : val % 1 === 0
                    ? val.toString()
                    : val.toFixed(1)
                : ''}
            </span>

            {/* Bar */}
            <div
              style={{
                width: 28,
                height: 96,
                display: 'flex',
                alignItems: 'flex-end',
                borderRadius: 6,
                overflow: 'hidden',
                background: isFuture
                  ? '#1A1E24'
                  : isSelected
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.06)',
                outline: isCurrent
                  ? '1.5px solid #B5F23D'
                  : isSelected && !isFuture
                    ? '1.5px solid rgba(255,255,255,0.2)'
                    : 'none',
                outlineOffset: 2,
                boxShadow: isCurrent ? '0 0 8px rgba(181,242,61,0.3)' : 'none',
                transition: 'outline 0.15s',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: isFuture ? '0%' : `${Math.max(pct, hasData ? 4 : 0)}%`,
                  background:
                    hasData && !isFuture
                      ? `linear-gradient(to bottom, ${barColor}, ${barColor}99)`
                      : 'transparent',
                  borderRadius: 6,
                  transition: 'height 0.3s ease',
                }}
              />
            </div>

            {/* Week label */}
            <span
              style={{
                fontSize: 9,
                fontWeight: isCurrent ? 700 : 600,
                color: isFuture
                  ? '#374151'
                  : isCurrent
                    ? '#B5F23D'
                    : isSelected
                      ? '#9CA3AF'
                      : '#6B7280',
                letterSpacing: '0.04em',
              }}
            >
              S{week.weekNumber}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Week row ──────────────────────────────────────────────────────────────────

function WeekRow({
  week,
  metric,
  currentWeek,
  dateRange,
  isHighlighted,
}: {
  week: WeeklyLoadPoint
  metric: Metric
  currentWeek: number
  dateRange: string
  isHighlighted: boolean
}) {
  const { getValue, unit } = METRIC_CONFIG[metric]
  const val = getValue(week)
  const isCurrent = week.weekNumber === currentWeek
  const isPastMissed = week.weekNumber < currentWeek && week.sessionCount === 0
  const isFuture = week.weekNumber > currentWeek

  let sessionLabel: React.ReactNode
  if (isFuture) {
    sessionLabel = <span style={{ color: '#374151' }}>Próxima</span>
  } else if (isCurrent && week.sessionCount === 0) {
    sessionLabel = <span style={{ color: '#F2C94A' }}>En curso</span>
  } else if (isPastMissed) {
    sessionLabel = <span style={{ color: '#F25252' }}>Sin sesiones</span>
  } else {
    sessionLabel = (
      <span style={{ color: '#6B7280' }}>
        {week.sessionCount} {week.sessionCount === 1 ? 'sesión' : 'sesiones'}
        {week.completedSets > 0 && ` · ${week.completedSets} series`}
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 10px',
        borderRadius: 10,
        background: isHighlighted ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderBottom: '1px solid #12161C',
        transition: 'background 0.15s',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isPastMissed || isFuture ? '#4B5563' : '#F0F0F0',
              margin: 0,
              lineHeight: 1,
            }}
          >
            Semana {week.weekNumber}
          </p>
          {isCurrent && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#B5F23D',
                background: 'rgba(181,242,61,0.12)',
                borderRadius: 4,
                padding: '2px 6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Actual
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#4B5563', margin: '4px 0 0' }}>
          {dateRange} · {sessionLabel}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {val !== null ? (
          <>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: isPastMissed ? '#4B5563' : '#F0F0F0',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {val >= 1000 ? `${(val / 1000).toFixed(2)} t` : val % 1 === 0 ? val : val.toFixed(1)}
            </p>
            <p style={{ fontSize: 10, color: '#6B7280', margin: '3px 0 0' }}>{unit}</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>—</p>
        )}
      </div>
    </div>
  )
}

function MuscleGroupBreakdown({
  breakdown,
  weekNumber,
}: {
  breakdown: Array<{ muscleGroup: string; completedSets: number }>
  weekNumber: number
}) {
  const hasAny = breakdown.some((b) => b.completedSets > 0)
  const maxSets = Math.max(...breakdown.map((b) => b.completedSets), 1)

  const ordered = MUSCLE_GROUPS_ORDER.map(
    (mg) => breakdown.find((b) => b.muscleGroup === mg) ?? { muscleGroup: mg, completedSets: 0 }
  )

  if (!hasAny) {
    return (
      <div style={{ padding: '16px 20px 4px' }}>
        <p style={{ fontSize: 11, color: '#4B5563', margin: 0, textAlign: 'center' }}>
          Sin sesiones en semana {weekNumber}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          margin: '0 0 10px',
        }}
      >
        Grupos musculares
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordered.map(({ muscleGroup, completedSets }) => {
          const pct = (completedSets / maxSets) * 100
          const hasData = completedSets > 0
          return (
            <div key={muscleGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: hasData ? '#9CA3AF' : '#4B5563',
                  width: 60,
                  flexShrink: 0,
                }}
              >
                {muscleGroup}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: '#1F2227',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: hasData ? '#B5F23D66' : 'transparent',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: hasData ? '#F0F0F0' : '#4B5563',
                  width: 32,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {hasData ? completedSets : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdherenceBlock({
  week,
  weekNumber,
}: {
  week: WeeklyLoadPoint
  weekNumber: number
}) {
  if (week.plannedSessions === 0) return null

  const sessionPct =
    week.plannedSets > 0 ? Math.round((week.completedSets / week.plannedSets) * 100) : null

  let label = ''
  let labelColor = '#6B7280'
  if (sessionPct !== null) {
    if (sessionPct >= 90) {
      label = 'Carga dentro del rango'
      labelColor = '#22C55E'
    } else if (sessionPct >= 70) {
      label = 'Carga moderada'
      labelColor = '#F59E0B'
    } else {
      label = 'Carga baja — revisar'
      labelColor = '#F87171'
    }
  }

  const sessionDots = Array.from(
    { length: week.plannedSessions },
    (_, i) => i < week.sessionCount
  )

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          margin: '0 0 10px',
        }}
      >
        Adherencia — Semana {weekNumber}
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {sessionDots.map((done, i) => (
          <span key={i} style={{ fontSize: 16, color: done ? '#B5F23D' : '#374151', lineHeight: 1 }}>
            {done ? '●' : '○'}
          </span>
        ))}
        <span style={{ fontSize: 11, color: '#6B7280', alignSelf: 'center', marginLeft: 4 }}>
          {week.sessionCount}/{week.plannedSessions} sesiones
        </span>
      </div>

      {week.plannedSets > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Series</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {week.completedSets}/{week.plannedSets}
            </span>
          </div>
          <div
            style={{ height: 6, borderRadius: 3, background: '#1F2227', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${Math.min((week.completedSets / week.plannedSets) * 100, 100)}%`,
                height: '100%',
                background: '#B5F23D66',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {label && (
        <p style={{ fontSize: 12, fontWeight: 600, color: labelColor, margin: 0 }}>
          {label}
        </p>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function WeeklyLoadChart({
  weeks,
  muscleByWeek,
  currentWeek,
  planStartDate,
}: {
  weeks: WeeklyLoadPoint[]
  muscleByWeek: MuscleWeekPoint[]
  currentWeek: number
  planStartDate: string
}) {
  const [metric, setMetric] = useState<Metric>('tonnage')
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)

  // Pre-compute date ranges once — stable until planStartDate/weeks changes
  const dateRanges = useMemo(
    () =>
      weeks.map((w) => {
        const { start, end } = getWeekDateRange(planStartDate, w.weekNumber)
        return formatDateRange(start, end)
      }),
    [weeks, planStartDate]
  )

  const selectedWeekData = weeks.find((w) => w.weekNumber === selectedWeek)
  const selectedMuscleData = muscleByWeek.find((m) => m.weekNumber === selectedWeek)

  const totalSessions = weeks.filter(w => w.weekNumber <= currentWeek).reduce((s, w) => s + w.sessionCount, 0)
  const hasData = totalSessions > 0
  const barColor = METRIC_COLORS[metric]

  function handleSelectWeek(weekNumber: number) {
    setSelectedWeek(weekNumber)
  }

  return (
    <div>
      {/* Metric selector */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: metric === m ? `1px solid ${METRIC_COLORS[m]}` : '1px solid #252A31',
              background:
                metric === m ? `${METRIC_COLORS[m]}18` : 'linear-gradient(160deg,#12161C,#0F1217)',
              color: metric === m ? METRIC_COLORS[m] : '#6B7280',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: '16px 20px 0' }}>
        {hasData ? (
          <>
            <BarChart
              data={weeks}
              metric={metric}
              currentWeek={currentWeek}
              selectedWeek={selectedWeek}
              onSelectWeek={handleSelectWeek}
            />
            <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'right', margin: '2px 0 0' }}>
              {METRIC_CONFIG[metric].unit}
            </p>
          </>
        ) : (
          <div
            style={{ height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <p style={{ fontSize: 13, color: '#4B5563' }}>Sin sesiones completadas aún</p>
          </div>
        )}
      </div>

      {/* Muscle group breakdown — reactivo a selectedWeek */}
      {selectedMuscleData && (
        <MuscleGroupBreakdown
          breakdown={selectedMuscleData.breakdown}
          weekNumber={selectedWeek}
        />
      )}

      {/* Adherencia — reactivo a selectedWeek */}
      {selectedWeekData && (
        <AdherenceBlock week={selectedWeekData} weekNumber={selectedWeek} />
      )}

      {/* Legend */}
      {hasData && (
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: barColor }} />
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            Semana actual destacada · toca una barra para resaltarla
          </span>
        </div>
      )}

      {/* Week detail list */}
      <div style={{ padding: '8px 20px 0' }}>
        {weeks.map((week, i) => (
          <WeekRow
            key={week.weekNumber}
            week={week}
            metric={metric}
            currentWeek={currentWeek}
            dateRange={dateRanges[i]}
            isHighlighted={selectedWeek === week.weekNumber}
          />
        ))}
      </div>
    </div>
  )
}
