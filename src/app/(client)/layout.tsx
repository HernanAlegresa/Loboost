import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import ClientBottomNav from '@/components/ui/client-bottom-nav'
import { SAFE_HEADER_PADDING_TOP } from '@/lib/ui/safe-area'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/coach/dashboard')

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
        color: '#F0F0F0',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#0A0A0A',
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 16,
          paddingTop: SAFE_HEADER_PADDING_TOP,
          flexShrink: 0,
          borderBottom: '1px solid #1F2227',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
      </header>

      {/* Scrollable content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      <ClientBottomNav />
    </div>
  )
}
