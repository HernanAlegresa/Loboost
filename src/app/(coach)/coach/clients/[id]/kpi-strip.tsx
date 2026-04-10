type Props = {
  weeklyCompliance: number
  daysSinceLastSession: number | null
  totalSessions: number
}

function complianceColor(v: number): string {
  if (v >= 70) return '#B5F23D'
  if (v >= 40) return '#F2994A'
  return '#F25252'
}

function lastSessionValue(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 dia'
  return `${days} dias`
}

function KpiCard({
  label,
  value,
  valueColor = '#F0F0F0',
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {value}
      </p>
    </div>
  )
}

export default function KpiStrip({ weeklyCompliance, daysSinceLastSession, totalSessions }: Props) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <KpiCard
        label="Cumplimiento"
        value={`${weeklyCompliance}%`}
        valueColor={complianceColor(weeklyCompliance)}
      />
      <KpiCard
        label="Ult. sesion"
        value={lastSessionValue(daysSinceLastSession)}
        valueColor={daysSinceLastSession === null ? '#4B5563' : '#F0F0F0'}
      />
      <KpiCard label="Sesiones" value={totalSessions} />
    </div>
  )
}
