import Skeleton from '@/components/ui/skeleton'

export default function ClientHistoryLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width={100} height={11} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={11} />
          </div>
          <Skeleton width={40} height={22} borderRadius={20} />
        </div>
      ))}
    </div>
  )
}
