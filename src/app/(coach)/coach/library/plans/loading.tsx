import Skeleton from '@/components/ui/skeleton'

export default function LibraryPlansLoading() {
  return (
    <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: '#111317', border: '1px solid #1F2227', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={180} height={16} />
          <Skeleton width={100} height={12} />
        </div>
      ))}
    </div>
  )
}
