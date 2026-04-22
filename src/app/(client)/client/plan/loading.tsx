import Skeleton from '@/components/ui/skeleton'

export default function ClientPlanLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Skeleton width={180} height={22} />
      <Skeleton width={120} height={13} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width={140} height={16} />
          <Skeleton width="90%" height={13} />
          <Skeleton width="70%" height={13} />
        </div>
      ))}
    </div>
  )
}
