type ProgressPoint = {
  label: string
  completed: number
}

type Props = {
  points: ProgressPoint[]
}

export default function ProgressOverview({ points }: Props) {
  const max = Math.max(1, ...points.map((p) => p.completed))
  const total = points.reduce((acc, p) => acc + p.completed, 0)

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 14px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, color: '#F0F0F0', fontWeight: 600 }}>Últimas 6 semanas</p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          {total} {total === 1 ? 'sesión' : 'sesiones'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-end' }}>
        {points.map((point) => {
          const barHeight = Math.max(6, Math.round((point.completed / max) * 52))
          const isCurrent = point === points[points.length - 1]
          return (
            <div key={point.label} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: 56,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 24,
                    height: barHeight,
                    borderRadius: 8,
                    backgroundColor: isCurrent ? '#B5F23D' : '#2A2D34',
                    transition: 'height 220ms ease',
                  }}
                />
              </div>
              <p style={{ fontSize: 10, color: '#6B7280', marginTop: 6 }}>{point.label}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>
                {point.completed}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
