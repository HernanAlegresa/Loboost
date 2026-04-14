import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from './queries'
import ClientList from './client-list'
import Fab from './fab'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Igual al espacio saludo → filtros: paddingBottom saludo (22) + marginTop lista (26) + paddingTop tabs (6). */
const HEADER_TO_GREETING_PX = 22 + 26 + 6

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
      {/* Saludo: avatar anclado a la izquierda, copy alineado a la derecha */}
      <div
        style={{
          padding: `${HEADER_TO_GREETING_PX}px 20px 22px`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: '#1A1D22',
            border: '2px solid #B5F23D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: 20,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 600, color: '#B5F23D' }}>
            {firstName[0]?.toUpperCase() ?? 'C'}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            textAlign: 'right',
            marginRight: 20,
          }}
        >
          <p style={{ fontSize: 22, color: '#9CA3AF', lineHeight: 1.25, margin: 0 }}>{greeting},</p>
          <p
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1.1,
              margin: 0,
              marginTop: 6,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {firstName}
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: 0,
              marginTop: 10,
              lineHeight: 1.35,
            }}
          >
            {dateFormatted}
          </p>
        </div>
      </div>

      {/* Lista: marginBottom reserva zona del FAB; menor valor = contenedor más alto hacia abajo */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          marginTop: 26,
          marginBottom: 185,
        }}
      >
        <ClientList clients={dashboardData.clients} bottomPadding={96} />
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
