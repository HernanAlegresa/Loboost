import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '../dashboard/queries'
import ClientList from '../dashboard/client-list'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { clients } = await getDashboardData(user.id)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Clientes</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
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
            flexShrink: 0,
          }}
        >
          <Plus size={20} color="#0A0A0A" strokeWidth={2.5} />
        </Link>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <ClientList clients={clients} />
      </div>
    </div>
  )
}
