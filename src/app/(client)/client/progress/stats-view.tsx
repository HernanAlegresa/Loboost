import type { ClientProgressStats } from './queries'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

function StatCard({ value, label, unit }: { value: number; label: string; unit?: string }) {
  return (
    <div
      style={{
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: '20px 16px', textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: T.lime }}>
        {value}
        {unit && <span style={{ fontSize: 18, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: T.secondary }}>{label}</p>
    </div>
  )
}

export default function StatsView({ stats }: { stats: ClientProgressStats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard value={stats.totalSessions} label="Sesiones completadas" />
        <StatCard value={stats.currentStreak} label="Semanas activas seguidas" />
      </div>
      {stats.totalSessions === 0 && (
        <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', paddingTop: 20 }}>
          Completá tu primera sesión para ver tus estadísticas.
        </p>
      )}
    </div>
  )
}
