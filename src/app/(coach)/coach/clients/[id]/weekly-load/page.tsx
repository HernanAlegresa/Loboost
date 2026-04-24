import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getWeeklyLoadData } from '../progress-queries'
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

  const weeklyLoad = await getWeeklyLoadData(id, activePlan)

  const totalTonnage = weeklyLoad.reduce((s, w) => s + w.tonnageKg, 0)
  const totalSessions = weeklyLoad.reduce((s, w) => s + w.sessionCount, 0)
  const totalSets = weeklyLoad.reduce((s, w) => s + w.completedSets, 0)

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

        {/* KPI strip */}
        <KpiStrip tonnage={totalTonnage} sessions={totalSessions} sets={totalSets} />

        {/* Interactive chart */}
        <WeeklyLoadChart
          data={weeklyLoad}
          currentWeek={activePlan.currentWeek}
          planStartDate={activePlan.startDate}
        />
      </div>
    </div>
  )
}

function KpiStrip({
  tonnage,
  sessions,
  sets,
}: {
  tonnage: number
  sessions: number
  sets: number
}) {
  const tonnageStr = tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)} t` : `${tonnage} kg`

  const items = [
    { value: tonnageStr, label: 'Tonelaje' },
    { value: sessions.toString(), label: 'Sesiones' },
    { value: sets.toString(), label: 'Series' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 1,
        margin: '12px 20px 0',
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            padding: '14px 8px',
            borderLeft: idx > 0 ? '1px solid #1F2227' : 'none',
          }}
        >
          <span
            style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', lineHeight: 1 }}
          >
            {item.value}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              textAlign: 'center',
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
