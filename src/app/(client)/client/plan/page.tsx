import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClientPlanViewData } from './queries'
import PlanView from './plan-view'

export default async function ClientPlanPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getClientPlanViewData(user.id)

  if (!data) {
    return (
      <div style={{ padding: '20px 20px 120px' }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#F0F0F0',
            marginBottom: 20,
          }}
        >
          Mi plan
        </p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563' }}>
            Tu coach todavía no te asignó un plan.
          </p>
        </div>
      </div>
    )
  }

  return <PlanView data={data} />
}
