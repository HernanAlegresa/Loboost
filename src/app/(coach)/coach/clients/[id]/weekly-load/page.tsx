import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getWeeklyLoadEnrichedData } from '../progress-queries'
import type { WeeklyLoadPoint } from '../progress-queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import WeeklyLoadChart from './weekly-load-chart'

function WeeklyHeroKpis({
  weeks,
  currentWeek,
}: {
  weeks: WeeklyLoadPoint[]
  currentWeek: number
}) {
  const curr = weeks.find((w) => w.weekNumber === currentWeek)
  const prev = weeks.find((w) => w.weekNumber === currentWeek - 1)

  function wowPct(
    current: number | null | undefined,
    previous: number | null | undefined
  ): number | null {
    if (current == null || previous == null || previous === 0) return null
    return Math.round(((current - previous) / previous) * 100)
  }

  const tonnagePct = wowPct(curr?.tonnageKg, prev?.tonnageKg)
  const intensityPct = wowPct(curr?.avgIntensityKg, prev?.avgIntensityKg)

  const tonnageStr =
    (curr?.tonnageKg ?? 0) >= 1000
      ? `${((curr?.tonnageKg ?? 0) / 1000).toFixed(1)} t`
      : `${curr?.tonnageKg ?? 0} kg`

  function Delta({ pct }: { pct: number | null }) {
    if (pct === null) return <span style={{ color: '#6B7280', fontSize: 11 }}>—</span>
    const up = pct >= 0
    return (
      <span style={{ color: up ? '#22C55E' : '#F87171', fontSize: 11, fontWeight: 600 }}>
        {up ? '↑' : '↓'} {Math.abs(pct)}%
      </span>
    )
  }

  const cards = [
    {
      label: 'Tonelaje',
      value: tonnageStr,
      sub: <Delta pct={tonnagePct} />,
    },
    {
      label: 'Volumen',
      value: `${curr?.completedSets ?? 0} series`,
      sub: curr?.plannedSets ? (
        <span style={{ color: '#6B7280', fontSize: 11 }}>
          {curr.completedSets} / {curr.plannedSets} plan.
        </span>
      ) : (
        <span style={{ color: '#6B7280', fontSize: 11 }}>sin plan</span>
      ),
    },
    {
      label: 'Intensidad',
      value: curr?.avgIntensityKg != null ? `${curr.avgIntensityKg} kg/s` : '—',
      sub: <Delta pct={intensityPct} />,
    },
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
      {cards.map((card, idx) => (
        <div
          key={card.label}
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
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              textAlign: 'center',
            }}
          >
            {card.label}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {card.value}
          </span>
          <div>{card.sub}</div>
        </div>
      ))}
    </div>
  )
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

  const { activePlan } = basic

  if (!activePlan) {
    return (
      <>
        <FlowHeaderConfig
          title="Carga semanal"
          fallbackHref={`/coach/clients/${id}`}
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
      </>
    )
  }

  const enriched = await getWeeklyLoadEnrichedData(id, activePlan)

  return (
    <>
      <FlowHeaderConfig
        title="Carga semanal"
        fallbackHref={`/coach/clients/${id}`}
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

        <WeeklyHeroKpis weeks={enriched.weeks} currentWeek={activePlan.currentWeek} />

        {/* Interactive chart */}
        <WeeklyLoadChart
          weeks={enriched.weeks}
          muscleByWeek={enriched.muscleByWeek}
          currentWeek={activePlan.currentWeek}
          planStartDate={activePlan.startDate}
        />
      </div>
    </>
  )
}
