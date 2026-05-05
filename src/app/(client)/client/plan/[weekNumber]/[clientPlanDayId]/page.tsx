import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getDayDetailData } from './queries'
import DayDetailClient from './day-detail-client'
import { FlowHeaderConfig } from '@/components/ui/header-context'

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

  const formattedDate = new Date(data.dateISO + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <div style={{ padding: '0 0 120px' }}>
      <FlowHeaderConfig
        title={DAY_LONG[data.dayOfWeek]}
        subtitle={`Semana ${data.weekNumber} · ${formattedDate}`}
        fallbackHref="/client/plan"
        rightSlot={data.sessionStatus === 'completed' ? (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
            Completado
          </span>
        ) : undefined}
      />
      <DayDetailClient data={data} weekNumber={weekNumber} />
    </div>
  )
}
