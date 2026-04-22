import Skeleton from '@/components/ui/skeleton'

export default function CoachDashboardLoading() {
  return (
    <div style={{ padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#1A1D24' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton width={120} height={22} />
          <Skeleton width={160} height={36} />
          <Skeleton width={100} height={14} />
        </div>
      </div>
      {/* Heatmap */}
      <Skeleton height={180} borderRadius={16} />
    </div>
  )
}
