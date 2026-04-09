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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0A0A0A', color: '#F0F0F0' }}>
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
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ cursor: 'pointer' }}>
            <Search size={20} color="#E5E7EB" />
          </div>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={20} color="#E5E7EB" />
          </div>
        </div>
      </header>

      {/* Main content — flex: 1, solo la lista interna hace scroll */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
