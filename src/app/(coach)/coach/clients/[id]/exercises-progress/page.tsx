import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getExerciseProgressData } from '../progress-queries'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import Avatar from '@/components/ui/avatar'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import ExercisesProgressList from './exercises-progress-list'

function ClientAvatarSlot({ fullName }: { fullName: string }) {
  return <Avatar fullName={fullName} size="md" />
}

export default async function ExercisesProgressPage({
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
          title="Progreso de ejercicios"
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
            Sin plan activo. Asigna un plan para rastrear el progreso de ejercicios.
          </p>
        </div>
      </div>
    )
  }

  const exercises = await getExerciseProgressData(id, activePlan)
  const exercisesWithData = exercises.filter((ex) => ex.sessionCount > 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${id}?tab=progress`}
        title="Progreso de ejercicios"
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
        {/* Summary */}
        <div style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Ejercicios realizados por{' '}
            <span style={{ color: '#F0F0F0', fontWeight: 600 }}>{fullName}</span>
            {': '}
            <span style={{ color: '#B5F23D', fontWeight: 700 }}>{exercisesWithData.length}</span>
          </p>
          {exercisesWithData.length > 0 && (
            <p style={{ fontSize: 11, color: '#4B5563', margin: '6px 0 0' }}>
              Tocá un grupo para ver los ejercicios
            </p>
          )}
        </div>

        {/* List */}
        <div style={{ padding: '0 20px' }}>
          <ExercisesProgressList exercises={exercisesWithData} clientId={id} />
        </div>
      </div>
    </div>
  )
}
