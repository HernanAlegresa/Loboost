import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/bottom-nav'
import CoachNotificationBell from '@/components/ui/coach-notification-bell'
import CoachSearchOverlay from '@/components/ui/coach-search-overlay'
import { SAFE_HEADER_PADDING_TOP } from '@/lib/ui/safe-area'
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
      {/* Header fijo por flex (no sticky): no se mueve con el scroll interno */}
      <header
        style={{
          flexShrink: 0,
          zIndex: 50,
          backgroundColor: '#0A0A0A',
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 16,
          paddingTop: SAFE_HEADER_PADDING_TOP,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CoachSearchOverlay coachId={user.id} clients={clientItems} />
          <CoachNotificationBell clientsNeedingAttention={clientsNeedingAttention} />
        </div>
      </header>

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
  )
}
