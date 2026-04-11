import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from './queries'
import KpiStrip from './kpi-strip'
import ClientList from './client-list'
import Fab from './fab'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const [profileResult, dashboardData] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getDashboardData(user.id),
  ])

  const fullName = profileResult.data?.full_name ?? 'Coach'
  const firstName = fullName.split(' ')[0]

  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

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
      {/* Greeting */}
      <div
        style={{
          padding: '20px 20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: 16, color: '#F0F0F0' }}>{greeting},</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F0', lineHeight: 1.2 }}>
            {firstName}
          </p>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {dateFormatted}
          </p>
        </div>
        {/* Coach avatar placeholder */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#1A1D22',
            border: '2px solid #B5F23D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 600, color: '#B5F23D' }}>
            {firstName[0]?.toUpperCase() ?? 'C'}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <KpiStrip
          totalClients={dashboardData.totalClients}
          activeClients={dashboardData.activeClients}
          momentumPercent={dashboardData.momentumPercent}
          sparklineData={dashboardData.sparklineData}
        />
      </div>

      {/* Client list with filter tabs — toma el espacio restante y scrollea internamente */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, marginTop: 24 }}>
        <ClientList clients={dashboardData.clients} />
      </div>

      {/* Bottom fade overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to bottom, transparent, #0A0A0A)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* FAB Speed Dial */}
      <Fab />
    </div>
  )
}
