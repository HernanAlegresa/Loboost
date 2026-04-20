import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientProgressData } from './queries'
import ProgressView from './progress-view'

export default async function ClientProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientProgressData(user.id)

  return <ProgressView data={data} clientId={user.id} />
}
