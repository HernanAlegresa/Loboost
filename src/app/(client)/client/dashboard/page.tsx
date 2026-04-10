import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientDashboardData } from './queries'
import TodayCard from './today-card'

const DAY_NAMES = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function todayDayName(): string {
  const d = new Date().getDay() // 0=Sun
  return DAY_NAMES[d === 0 ? 7 : d]
}

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientDashboardData(user.id)

  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Greeting */}
      <div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>
          Bienvenido
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>
          {data.fullName}
        </p>
      </div>

      {/* Active plan */}
      <div>
        <p style={SECTION_TITLE}>Plan activo</p>
        {data.activePlan ? (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#F0F0F0',
                marginBottom: 6,
              }}
            >
              {data.activePlan.name}
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
              Semana {data.activePlan.currentWeek} de {data.activePlan.weeks}
              {' · '}
              {formatDate(data.activePlan.startDate)} →{' '}
              {formatDate(data.activePlan.endDate)}
            </p>
            <div
              style={{
                backgroundColor: '#1F2227',
                borderRadius: 9999,
                height: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${data.activePlan.progressPct}%`,
                  backgroundColor: '#B5F23D',
                  borderRadius: 9999,
                }}
              />
            </div>
            <p
              style={{
                fontSize: 11,
                color: '#6B7280',
                marginTop: 6,
                textAlign: 'right',
              }}
            >
              {data.activePlan.progressPct}%
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: '#4B5563' }}>
              No tenés un plan activo todavía.
            </p>
            <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
              Tu coach te asignará uno pronto.
            </p>
          </div>
        )}
      </div>

      {/* Today's training */}
      <div>
        <p style={SECTION_TITLE}>Hoy · {todayDayName()}</p>
        <TodayCard today={data.today} />
      </div>
    </div>
  )
}
