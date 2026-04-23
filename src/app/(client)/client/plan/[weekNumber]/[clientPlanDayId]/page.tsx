import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { getDayDetailData } from './queries'
import DayDetailClient from './day-detail-client'

const DAY_LONG = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string; clientPlanDayId: string }>
}) {
  const { weekNumber: wn, clientPlanDayId } = await params
  const weekNumber = parseInt(wn, 10)
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getDayDetailData(clientPlanDayId, user.id)
  if (!data) notFound()

  return (
    <div style={{ padding: '0 0 120px' }}>
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/client/plan"
          style={{
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          ←
        </Link>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
            {DAY_LONG[data.dayOfWeek]}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280' }}>
            Semana {data.weekNumber} ·{' '}
            {new Date(data.dateISO + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        {data.sessionStatus === 'completed' && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 9999,
              backgroundColor: 'rgba(181,242,61,0.12)',
              color: '#B5F23D',
            }}
          >
            Completado
          </span>
        )}
      </div>

      <DayDetailClient data={data} weekNumber={weekNumber} />
    </div>
  )
}
