import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientProfileData } from './queries'
import ClientProfileHeader from './client-profile-header'
import KpiStrip from './kpi-strip'
import TrainingWeek from './training-week'
import CoachNotes from './coach-notes'
import ProgressOverview from './progress-overview'
import ClientProfileTabsShell from './client-profile-tabs-shell'
import ClientProfileHeroCard from './client-profile-hero-card'
import ClientPlanHeatmapCard from './client-plan-heatmap-card'

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

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ClientProfileHeader
        fullName={profile.fullName}
        goal={profile.goal}
        statusColor={profile.statusColor}
      />
      <ClientProfileTabsShell
        profileContent={
          <>
            <ClientProfileHeroCard
              fullName={profile.fullName}
              statusColor={profile.statusColor}
              sex={profile.sex}
              experienceLevel={profile.experienceLevel}
              age={profile.age}
              weightKg={profile.weightKg}
              heightCm={profile.heightCm}
              daysPerWeek={profile.daysPerWeek}
              injuries={profile.injuries}
            />
            <ClientPlanHeatmapCard
              activePlan={profile.activePlan}
              initialWeekData={profile.currentWeekData}
              clientId={profile.id}
            />
            <CoachNotes clientId={profile.id} initialNote={profile.coachNote} />
          </>
        }
        progressContent={
          <>
            <KpiStrip
              weeklyCompliance={profile.weeklyCompliance}
              daysSinceLastSession={profile.daysSinceLastSession}
              totalSessions={profile.totalSessions}
            />
            <ProgressOverview points={profile.progressSeries} />
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Entrenamiento
              </p>
              {profile.currentWeekData && profile.activePlan ? (
                <TrainingWeek
                  initialData={profile.currentWeekData}
                  clientPlanId={profile.activePlan.id}
                  startDate={profile.activePlan.startDate}
                  clientId={profile.id}
                />
              ) : (
                <div
                  style={{
                    backgroundColor: '#111317',
                    border: '1px solid #1F2227',
                    borderRadius: 14,
                    padding: '24px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 14, color: '#4B5563' }}>
                    Sin plan activo - no hay entrenamientos que mostrar.
                  </p>
                </div>
              )}
            </div>
          </>
        }
      />
    </div>
  )
}
