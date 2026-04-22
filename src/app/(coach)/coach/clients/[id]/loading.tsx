import Skeleton from '@/components/ui/skeleton'

export default function ClientProfileLoading() {
  return (
    <div style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hero card */}
      <div style={{ background: '#111317', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={150} height={18} />
            <Skeleton width={100} height={12} />
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={60} borderRadius={12} style={{ flex: 1 }} />
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1F2227' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={44} style={{ flex: 1 }} borderRadius={0} />
        ))}
      </div>
      {/* Content */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={72} borderRadius={14} />
        ))}
      </div>
    </div>
  )
}
