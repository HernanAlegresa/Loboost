import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClientProfileData } from './queries'
import { getProgressKPIs, getNavTileStats } from './progress-queries'
import { getCoachSessionsTimeline } from './sessions/queries'
import { isPlanExpired } from '@/features/clients/utils/training-utils'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import ClientProfileTabsShell from './client-profile-tabs-shell'
import ClientProfileHeroCard from './client-profile-hero-card'
import ClientPlanHeatmapCard from './client-plan-heatmap-card'
import ClientProgressContent from './client-progress-content'
import ClientSessionsList from './client-sessions-list'

export default async function ClientProfilePage({
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

  const profile = await getClientProfileData(id, user.id)
  if (!profile) notFound()

  const [kpis, timeline, navTileStats] = await Promise.all([
    getProgressKPIs(id, profile.weightKg, profile.activePlan),
    getCoachSessionsTimeline(id, user.id),
    getNavTileStats(id, profile.activePlan),
  ])
  if (timeline === null) notFound()

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <FlowHeaderConfig
        title={profile.fullName}
        subtitle={profile.goal ?? 'Sin objetivo definido'}
        fallbackHref="/coach/clients"
        rightSlot={
          <Link
            href={`/coach/clients/${id}/edit`}
            aria-label="Editar datos del cliente"
            title="Editar datos del cliente"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0F1014',
              border: '1px solid #1F2227',
              borderRadius: 9999,
              color: '#9CA3AF',
              textDecoration: 'none',
            }}
          >
            <Pencil size={14} />
          </Link>
        }
      />
      <ClientProfileTabsShell
        profileContent={
          <>
            <ClientProfileHeroCard
              clientId={id}
              fullName={profile.fullName}
              status={profile.status}
              sex={profile.sex}
              experienceLevel={profile.experienceLevel}
              age={profile.age}
              weightKg={profile.weightKg}
              heightCm={profile.heightCm}
              daysPerWeek={profile.daysPerWeek}
              injuries={profile.injuries}
              planExpired={isPlanExpired(profile.activePlan?.endDate ?? null)}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {profile.activePlan ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#B5F23D',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Plan activo
                  </p>
                  <p
                    style={{
                      margin: 0,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#F0F0F0',
                      lineHeight: 1.2,
                      paddingBottom: 10,
                    }}
                  >
                    {profile.activePlan.name}
                  </p>
                </div>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 26,
                  paddingBottom: 16,
                }}
              >
                <Link
                  href={`/coach/clients/${profile.id}/plan/edit?mode=view`}
                  style={{
                    minHeight: 35,
                    minWidth: 112,
                    borderRadius: 20,
                    border: '1px solid #2A2D34',
                    backgroundColor: '#111317',
                    color: '#F0F0F0',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    padding: '0 12px',
                  }}
                >
                  Ver plan
                </Link>
                <Link
                  href={`/coach/clients/${profile.id}/plan/edit`}
                  style={{
                    minHeight: 35,
                    minWidth: 112,
                    borderRadius: 20,
                    border: 'none',
                    backgroundColor: '#B5F23D',
                    color: '#0A0A0A',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    padding: '0 12px',
                  }}
                >
                  Editar plan
                </Link>
              </div>
              <ClientPlanHeatmapCard
                activePlan={profile.activePlan}
                initialWeekData={profile.currentWeekData}
                clientId={profile.id}
              />
            </div>
          </>
        }
        progressContent={
          <ClientProgressContent
            clientId={profile.id}
            progressKPIs={kpis}
            activePlan={profile.activePlan}
            totalSessions={profile.totalSessions}
            progressSeries={profile.progressSeries}
            navTileStats={navTileStats}
            clientStatus={profile.status}
          />
        }
        sessionsContent={
          <ClientSessionsList
            timeline={timeline}
            clientId={profile.id}
          />
        }
      />
    </div>
  )
}
