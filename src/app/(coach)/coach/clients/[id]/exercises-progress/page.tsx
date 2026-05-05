import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getExerciseProgressData } from '../progress-queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import ExercisesProgressList from './exercises-progress-list'

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
        <FlowHeaderConfig title="Progreso de ejercicios" fallbackHref={`/coach/clients/${id}?tab=progress`} />
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
      <FlowHeaderConfig title="Progreso de ejercicios" fallbackHref={`/coach/clients/${id}?tab=progress`} />

      {/* List — toma el alto restante con su propio scroll horizontal */}
      <ExercisesProgressList exercises={exercisesWithData} clientId={id} />
    </div>
  )
}
