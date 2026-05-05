import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getWeekDetailData } from './queries'
import WeekDetailClient from './week-detail-client'
import { FlowHeaderConfig } from '@/components/ui/header-context'

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const num = parseInt(weekNumber, 10)
  if (Number.isNaN(num) || num < 1) notFound()

  const data = await getWeekDetailData(user.id, num)
  if (!data) notFound()

  return (
    <div>
      <FlowHeaderConfig
        title={`Semana ${data.weekNumber}`}
        fallbackHref="/client/history"
      />
      <WeekDetailClient data={data} weekNumber={num} />
    </div>
  )
}
