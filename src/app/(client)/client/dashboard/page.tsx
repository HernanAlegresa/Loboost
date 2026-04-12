import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientDashboardData } from './queries'
import TodayCard from './today-card'
import ClientAvatar from '@/components/ui/client-avatar'
import WeekStrip from './week-strip'

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const DAY_NAMES = [
  '',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
]

function formatFullDate(): string {
  const now = new Date()
  const dayOfWeek = DAY_NAMES[now.getDay() === 0 ? 7 : now.getDay()]
  const day = now.getDate()
  const month = MONTH_NAMES[now.getMonth()]
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${day} de ${month}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientDashboardData(user.id)

  const SECTION_TITLE: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  const resumeHref = data.inProgressSession
    ? `/client/training/${data.inProgressSession.sessionId}`
    : null

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClientAvatar name={data.fullName} size={46} />
        <div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>{formatFullDate()}</p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#F0F0F0',
              marginTop: 1,
            }}
          >
            Hola, {data.fullName.split(' ')[0]}
          </p>
        </div>
      </div>


      {data.activePlan ? (
        <div>
          <p style={SECTION_TITLE}>Plan activo</p>
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
                {data.activePlan.name}
              </p>
              <Link
                href="/client/plan"
                style={{
                  fontSize: 12,
                  color: '#B5F23D',
                  fontWeight: 600,
                  textDecoration: 'none',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                Ver plan →
              </Link>
            </div>
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
            Tu coach todavía no te asignó un plan.
          </p>
        </div>
      )}

      {data.weekStrip && data.weekStrip.length > 0 && (
        <div>
          <p style={SECTION_TITLE}>Esta semana</p>
          <WeekStrip
            days={data.weekStrip}
            trainingHref={resumeHref}
            currentWeek={data.activePlan!.currentWeek}
          />
        </div>
      )}

      <div>
        <p style={SECTION_TITLE}>Hoy</p>
        <TodayCard today={data.today} />
      </div>

      <Link
        href="/client/nutrition"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🥗</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
            Nutrición
          </p>
        </div>
        <span style={{ fontSize: 18, color: '#4B5563' }}>→</span>
      </Link>
    </div>
  )
}
