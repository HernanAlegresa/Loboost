import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import ClientBottomNav from '@/components/ui/client-bottom-nav'
import ClientNotificationBell from '@/components/ui/client-notification-bell'
import DynamicHeader from '@/components/ui/dynamic-header'
import { HeaderProvider } from '@/components/ui/header-context'
import { getClientNotificationData } from './queries'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/coach/dashboard')

  const notifData = await getClientNotificationData(user.id)

  return (
    <HeaderProvider>
      <div
        style={{
          height: '100dvh',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0A0A0A',
          color: '#F0F0F0',
          overscrollBehavior: 'none',
        }}
      >
        <DynamicHeader
          showBorder
          rootRightSlot={
            <ClientNotificationBell
              inProgressSession={notifData.inProgressSession}
              weekStrip={notifData.weekStrip}
            />
          }
        />

        {/* Scrollable content */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            paddingBottom: SAFE_BOTTOM_NAV_HEIGHT,
          }}
        >
          {children}
        </main>

        <ClientBottomNav />
      </div>
    </HeaderProvider>
  )
}
