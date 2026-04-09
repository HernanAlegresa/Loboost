import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/bottom-nav'
import { Bell, Search } from 'lucide-react'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#F0F0F0' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#0A0A0A',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ cursor: 'pointer' }}>
            <Search size={20} color="#6B7280" />
          </div>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={20} color="#6B7280" />
          </div>
        </div>
      </header>

      {/* Main content padded below for fixed bottom nav */}
      <main style={{ paddingBottom: 64 }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
