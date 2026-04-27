type ProgressPoint = {
  label: string
  completed: number
}

type Props = {
  points: ProgressPoint[]
  currentWeekIndex?: number
  trendArrow?: string
  trendLabel?: string
  trendColor?: string
}

function barColor(index: number, currentWeekIndex: number): string {
  if (index < currentWeekIndex) return '#4ADE80'           // past  → green
  if (index === currentWeekIndex) return '#B5F23D'         // current → lima
  return 'rgba(240,240,240,0.16)'                          // future → white dim
}

export default function ProgressOverview({
  points,
  currentWeekIndex = -1,
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
            const barHeight = Math.max(8, Math.round((point.completed / max) * 80))
            return (
              <div key={point.label} style={{ width: 56, textAlign: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    height: 88,
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
                      backgroundColor: barColor(index, currentWeekIndex),
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
