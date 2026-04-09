type StatCardProps = {
  label: string
  value: string | number
  valueColor?: string
  centered?: boolean
  labelRight?: React.ReactNode
  children?: React.ReactNode
}

export default function StatCard({ label, value, valueColor = '#F0F0F0', centered = false, labelRight, children }: StatCardProps) {
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 12px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      {centered ? (
        <p style={{ ...labelStyle, textAlign: 'center', marginBottom: 6 }}>{label}</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={labelStyle}>{label}</p>
          {labelRight}
        </div>
      )}

      {/* Value o children */}
      {children ? (
        // Sparkline: empujar al fondo de la tarjeta
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {children}
        </div>
      ) : (
        <p
          data-testid="stat-card-value"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1,
            textAlign: centered ? 'center' : 'left',
            marginTop: centered ? 8 : 0,
          }}
        >
          {value}
        </p>
      )}
    </div>
  )
}
