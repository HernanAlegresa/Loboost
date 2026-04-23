import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getClientProfileData } from '../queries'
import EditClientForm from '../edit-client-form'

export default async function EditClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profile = await getClientProfileData(clientId, user.id)
  if (!profile) notFound()

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
      }}
    >
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}?tab=profile`}
        title="Editar cliente"
        subtitle={profile.fullName}
        backColor="#B5F23D"
        titleSize={20}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: '4px 20px 120px',
        }}
      >
        <EditClientForm
          clientId={clientId}
          cancelHref={`/coach/clients/${clientId}?tab=profile`}
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
      </div>
    </div>
  )
}
