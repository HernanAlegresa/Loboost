import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientProfileData } from './queries'
import { getProgressKPIs } from './progress-queries'
import { isPlanExpired } from '@/features/clients/utils/training-utils'
import ClientProfileHeader from './client-profile-header'
import ClientProfileTabsShell from './client-profile-tabs-shell'
import ClientProfileHeroCard from './client-profile-hero-card'
import ClientPlanHeatmapCard from './client-plan-heatmap-card'
import ClientProgressContent from './client-progress-content'
import EditClientForm from './edit-client-form'
import LogMeasurementForm from './log-measurement-form'

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

  const kpis = await getProgressKPIs(id, profile.weightKg, profile.activePlan)

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
        clientId={profile.id}
        profileContent={
          <>
            <ClientProfileHeroCard
              clientId={id}
              fullName={profile.fullName}
              statusColor={profile.statusColor}
              sex={profile.sex}
              experienceLevel={profile.experienceLevel}
              age={profile.age}
              weightKg={profile.weightKg}
              heightCm={profile.heightCm}
              daysPerWeek={profile.daysPerWeek}
              injuries={profile.injuries}
              planExpired={isPlanExpired(profile.activePlan?.endDate ?? null)}
            />
            <EditClientForm
              clientId={profile.id}
              initial={{
                age: profile.age,
                sex: profile.sex,
                goal: profile.goal,
                weightKg: profile.weightKg,
                heightCm: profile.heightCm,
                experienceLevel: profile.experienceLevel,
                daysPerWeek: profile.daysPerWeek,
                injuries: profile.injuries,
              }}
            />
            <LogMeasurementForm clientId={profile.id} />
            <ClientPlanHeatmapCard
              activePlan={profile.activePlan}
              initialWeekData={profile.currentWeekData}
              clientId={profile.id}
            />
          </>
        }
        progressContent={
          <ClientProgressContent
            clientId={profile.id}
            progressKPIs={kpis}
            activePlan={profile.activePlan}
            totalSessions={profile.totalSessions}
          />
        }
      />
    </div>
  )
}
