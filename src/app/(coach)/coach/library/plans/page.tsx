import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoachPlans } from './queries'
import PlanList from './plan-list'

export default async function PlansLibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const plans = await getCoachPlans(user.id)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Planes</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {plans.length} {plans.length === 1 ? 'plantilla' : 'plantillas'}
          </p>
        </div>
        <Link
          href="/coach/library/plans/new"
          aria-label="Crear plantilla de plan"
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 120px' }}>
        <PlanList plans={plans} />
      </div>
    </div>
  )
}
