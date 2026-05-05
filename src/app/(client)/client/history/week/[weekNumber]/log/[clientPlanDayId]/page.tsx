import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLogSessionData } from './queries'
import LogSessionClient from './log-session-client'
import { FlowHeaderConfig } from '@/components/ui/header-context'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default async function LogSessionPage({
  params,
}: {
  params: Promise<{ weekNumber: string; clientPlanDayId: string }>
}) {
  const { weekNumber: wn, clientPlanDayId } = await params
  const weekNumber = parseInt(wn, 10)

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const data = await getLogSessionData(clientPlanDayId, user.id)
  if (!data) notFound()

  return (
    <div>
      <FlowHeaderConfig
        title={DAY_NAMES[data.dayOfWeek]}
        subtitle={`Semana ${weekNumber} · Registro`}
        fallbackHref={`/client/history/week/${weekNumber}`}
      />
      <LogSessionClient
        clientPlanDayId={clientPlanDayId}
        weekNumber={weekNumber}
        exercises={data.exercises}
      />
    </div>
  )
}
