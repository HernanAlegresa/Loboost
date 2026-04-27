import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getWeeklyLoadEnrichedData } from '../progress-queries'
import type { WeeklyLoadPoint } from '../progress-queries'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import Avatar from '@/components/ui/avatar'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import WeeklyLoadChart from './weekly-load-chart'

function ClientAvatarSlot({ fullName }: { fullName: string }) {
  return <Avatar fullName={fullName} size="md" />
}

export default async function WeeklyLoadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const basic = await getClientBasicForCoach(id, user.id)
  if (!basic) notFound()

  const { fullName, activePlan } = basic

  if (!activePlan) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CoachSubpageHeader
          backHref={`/coach/clients/${id}?tab=progress`}
          title="Carga semanal"
          backColor="#B5F23D"
          rightSlot={<ClientAvatarSlot fullName={fullName} />}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>
            Sin plan activo. Asigna un plan para ver la carga semanal.
          </p>
        </div>
      </div>
    )
  }

  const enriched = await getWeeklyLoadEnrichedData(id, activePlan)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${id}?tab=progress`}
        title="Carga semanal"
        backColor="#B5F23D"
        rightSlot={<ClientAvatarSlot fullName={fullName} />}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV,
        }}
      >
        {/* Plan info */}
        <div style={{ padding: '14px 20px 0' }}>
          <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>
            {activePlan.name} · Semana {activePlan.currentWeek} de {activePlan.weeks}
          </p>
        </div>

        {/* Interactive chart */}
        <WeeklyLoadChart
          weeks={enriched.weeks}
          muscleByWeek={enriched.muscleByWeek}
          currentWeek={activePlan.currentWeek}
          planStartDate={activePlan.startDate}
        />
      </div>
    </div>
  )
}
