import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientProfileData } from './queries'
import ClientProfileHeader from './client-profile-header'
import KpiStrip from './kpi-strip'
import TrainingWeek from './training-week'
import PlanCard from './plan-card'
import PhysicalProfile from './physical-profile'
import CoachNotes from './coach-notes'
import ProgressOverview from './progress-overview'

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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          padding: '20px 20px 120px',
        }}
      >
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

        <PlanCard activePlan={profile.activePlan} />

        <PhysicalProfile
          age={profile.age}
          sex={profile.sex}
          weightKg={profile.weightKg}
          heightCm={profile.heightCm}
          experienceLevel={profile.experienceLevel}
          daysPerWeek={profile.daysPerWeek}
          injuries={profile.injuries}
        />

        <CoachNotes clientId={profile.id} initialNote={profile.coachNote} />
      </div>
    </div>
  )
}
