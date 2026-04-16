import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '../dashboard/queries'
import ClientsTabsContainer from './clients-tabs-container'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { clients } = await getDashboardData(user.id)

  return <ClientsTabsContainer clients={clients} />
}
