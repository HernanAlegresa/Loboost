import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/bottom-nav'
import CoachNotificationBell from '@/components/ui/coach-notification-bell'
import CoachSearchOverlay from '@/components/ui/coach-search-overlay'
import DynamicHeader from '@/components/ui/dynamic-header'
import { HeaderProvider } from '@/components/ui/header-context'
import { getDashboardData, countCoachClientsNeedingAttention } from './coach/dashboard/queries'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { clients } = await getDashboardData(user.id)
  const clientsNeedingAttention = countCoachClientsNeedingAttention(clients)

  const clientItems = clients.map((c) => ({ id: c.id, fullName: c.fullName }))

  return (
    <HeaderProvider>
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0A0A0A',
          color: '#F0F0F0',
          overscrollBehavior: 'none',
        }}
      >
        {/* DynamicHeader: root variant por defecto; páginas de flujo inyectan config via FlowHeaderConfig */}
        <DynamicHeader
          rootRightSlot={
            <>
              <CoachSearchOverlay coachId={user.id} clients={clientItems} />
              <CoachNotificationBell clientsNeedingAttention={clientsNeedingAttention} />
            </>
          }
        />

        {/* Main content — flex: 1, solo la lista interna hace scroll */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>

        <BottomNav />
      </div>
    </HeaderProvider>
  )
}
