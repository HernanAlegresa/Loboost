import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getLiveSessionData } from './queries'
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

  return <LiveTraining session={session} />
}
