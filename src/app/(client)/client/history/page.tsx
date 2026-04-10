import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getSessionHistory } from './queries'

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
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sessions = await getSessionHistory(user.id)

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>
        Historial
      </p>

      {sessions.length === 0 ? (
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563' }}>
            Todavía no hay sesiones registradas.
          </p>
          <p style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
            Completá tu primer entrenamiento para verlo acá.
          </p>
        </div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
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
                {s.planName}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>
                {s.dayOfWeek > 0 ? `${DAY_NAMES[s.dayOfWeek]} · ` : ''}
                {formatDate(s.date)}
              </p>
            </div>
            <span
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 9999,
                backgroundColor:
                  s.status === 'completed'
                    ? 'rgba(181,242,61,0.12)'
                    : 'rgba(242,153,74,0.12)',
                color: s.status === 'completed' ? '#B5F23D' : '#F2994A',
              }}
            >
              {s.status === 'completed' ? 'Completado' : 'En progreso'}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
