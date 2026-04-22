import Skeleton from '@/components/ui/skeleton'

export default function ClientProgressLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={80} height={32} borderRadius={20} />
        <Skeleton width={72} height={32} borderRadius={20} />
        <Skeleton width={100} height={32} borderRadius={20} />
      </div>
      {/* Exercise cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton width={160} height={16} />
          <Skeleton height={120} borderRadius={10} />
        </div>
      ))}
    </div>
  )
}
