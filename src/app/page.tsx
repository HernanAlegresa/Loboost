import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getUserRole()

  if (role === 'coach') redirect('/coach/dashboard')
  if (role === 'client') redirect('/client/dashboard')

  redirect('/login')
}
