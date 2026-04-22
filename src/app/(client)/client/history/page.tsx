import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getWeeklyHistorySummaries } from './queries'

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sStr = s.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  const eStr = e.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return `${sStr} – ${eStr}`
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const weeks = await getWeeklyHistorySummaries(user.id)

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Historial</p>

      {weeks.length === 0 ? (
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 16,
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(181, 242, 61, 0.08)',
              border: '1px solid rgba(181, 242, 61, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 4,
            }}
          >
            📅
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
            Sin semanas registradas
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
            Completá tu primera semana de entrenamiento{'\n'}y aparecerá aquí.
          </p>
        </div>
      ) : (
        weeks.map((week) => (
          <Link
            key={week.weekNumber}
            href={`/client/history/week/${week.weekNumber}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                backgroundColor: '#111317',
                border: '1px solid #1F2227',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#F0F0F0',
                    marginBottom: 3,
                  }}
                >
                  Semana {week.weekNumber}
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
                  {formatDateRange(week.dateRangeStart, week.dateRangeEnd)}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {week.completedDays} de {week.totalTrainingDays} días
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color:
                      week.compliancePct >= 80
                        ? '#B5F23D'
                        : week.compliancePct >= 50
                          ? '#F2994A'
                          : '#F25252',
                  }}
                >
                  {week.compliancePct}%
                </p>
                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  cumplimiento
                </p>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
