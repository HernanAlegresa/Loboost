import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getLiveSessionData, getPrevSessionSets } from './queries'
import LiveTraining from './live-training'

export default async function LiveTrainingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const session = await getLiveSessionData(sessionId, user.id)
  if (!session) notFound()

  const exerciseIds = session.exercises.map((e) => e.exerciseId)
  const prevSets = await getPrevSessionSets(user.id, exerciseIds, sessionId)

  return <LiveTraining session={session} prevSets={prevSets} />
}
