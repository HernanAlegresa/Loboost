import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLogSessionData } from './queries'
import LogSessionClient from './log-session-client'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const T = { bg: '#0A0A0A', border: '#1F2227', text: '#F0F0F0', muted: '#6B7280' } as const

export default async function LogSessionPage({
  params,
}: {
  params: Promise<{ weekNumber: string; clientPlanDayId: string }>
}) {
  const { weekNumber: wn, clientPlanDayId } = await params
  const weekNumber = parseInt(wn, 10)

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const data = await getLogSessionData(clientPlanDayId, user.id)
  if (!data) notFound()

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <a
          href={`/client/history/week/${weekNumber}`}
          style={{ color: T.muted, textDecoration: 'none', fontSize: 20 }}
        >
          ←
        </a>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>
            Registrar entrenamiento
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>
            Semana {weekNumber} · {DAY_NAMES[data.dayOfWeek]}
          </p>
        </div>
      </div>

      <LogSessionClient
        clientPlanDayId={clientPlanDayId}
        weekNumber={weekNumber}
        exercises={data.exercises}
      />
    </div>
  )
}
