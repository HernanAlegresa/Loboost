import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlowHeaderConfig } from '@/components/ui/header-context'
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
    <>
      <FlowHeaderConfig
        title={profile.fullName}
        fallbackHref={`/coach/clients/${clientId}`}
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
    </>
  )
}
