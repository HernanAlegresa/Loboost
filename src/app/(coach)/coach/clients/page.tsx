import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '../dashboard/queries'
import ClientList from '../dashboard/client-list'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { clients } = await getDashboardData(user.id)

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ paddingLeft: 100, minWidth: 0 }}>
          <p style={{ fontSize: 35, fontWeight: 700, color: '#F0F0F0', lineHeight: 1.15 }}>Clientes</p>
        </div>
        <div style={{ paddingRight: 10, flexShrink: 0 }}>
          <Link
            href="/coach/clients/new"
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#B5F23D',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <Plus size={20} color="#0A0A0A" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* Lista: sin degradado (no hay FAB); margen inferior para no pegar al footer */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          marginTop: 22,
          marginBottom: 88,
        }}
      >
        <ClientList clients={clients} bottomPadding={COACH_LIST_SCROLL_END_ABOVE_NAV} />
      </div>
    </div>
  )
}
