type ProgressPoint = {
  label: string
  completed: number
  status: 'al_dia' | 'naranja' | 'riesgo' | 'sin_plan' | 'current' | 'future'
}

type Props = {
  points: ProgressPoint[]
  trendArrow?: string
  trendLabel?: string
  trendColor?: string
}

function barColor(status: ProgressPoint['status']): string {
  if (status === 'current') return '#B5F23D'
  if (status === 'al_dia') return '#22C55E'
  if (status === 'naranja') return '#F2C94A'
  if (status === 'riesgo') return '#F25252'
  if (status === 'sin_plan') return '#6B7280'
  return 'rgba(229,231,235,0.32)'
}

export default function ProgressOverview({
  points,
  trendArrow,
  trendLabel,
  trendColor,
}: Props) {
  const max = Math.max(1, ...points.map((p) => p.completed))

  if (points.length === 0) return null

  return (
    <div>
      {trendLabel && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: trendColor ?? '#6B7280',
            margin: '0 0 12px',
          }}
        >
          {trendArrow} {trendLabel}
        </p>
      )}

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            minWidth: 'max-content',
          }}
        >
          {points.map((point, index) => {
            const barHeight = Math.max(12, Math.round((point.completed / max) * 104))
            return (
              <div key={point.label} style={{ width: 56, textAlign: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    height: 118,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: barHeight,
                      borderRadius: 8,
                      backgroundColor: barColor(point.status),
                      transition: 'height 220ms ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 7, marginBottom: 0 }}>
                  {point.label}
                </p>
                <p style={{ fontSize: 14, color: '#F0F0F0', marginTop: 3, marginBottom: 0, fontWeight: 600 }}>
                  {point.completed}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
