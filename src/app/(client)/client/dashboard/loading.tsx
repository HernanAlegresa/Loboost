import Skeleton from '@/components/ui/skeleton'

export default function ClientDashboardLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header avatar + nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <Skeleton width={80} height={11} />
          <Skeleton width={140} height={20} />
        </div>
      </div>
      {/* Plan activo */}
      <div style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width={120} height={16} />
        <Skeleton width={180} height={11} />
        <Skeleton height={4} borderRadius={9999} />
      </div>
      {/* Semana strip */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 56, background: '#111317', border: '1px solid #1F2227', borderRadius: 12 }} />
        ))}
      </div>
      {/* Hoy card */}
      <div style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width={60} height={11} />
        <Skeleton height={20} />
        <Skeleton width="70%" height={14} />
        <Skeleton height={44} borderRadius={12} />
      </div>
    </div>
  )
}
