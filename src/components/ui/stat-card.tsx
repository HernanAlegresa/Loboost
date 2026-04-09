type StatCardProps = {
  label: string
  value: string | number
  valueColor?: string
  children?: React.ReactNode
}

export default function StatCard({ label, value, valueColor = '#F0F0F0', children }: StatCardProps) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 16px',
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {children ?? (
        <p
          data-testid="stat-card-value"
          style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1 }}
        >
          {value}
        </p>
      )}
    </div>
  )
}
