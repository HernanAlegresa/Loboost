import Skeleton from '@/components/ui/skeleton'

export default function CoachClientsLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width={100} height={11} style={{ marginBottom: 8 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A1D24', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Skeleton width={130} height={14} />
            <Skeleton width={80} height={11} />
          </div>
          <Skeleton width={60} height={22} borderRadius={20} />
        </div>
      ))}
    </div>
  )
}
