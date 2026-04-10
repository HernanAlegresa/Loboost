import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
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
      <CoachSubpageHeader
        backHref="/coach/library"
        title="Planes"
        titleColor="#F0F0F0"
        subtitle={`${plans.length} ${plans.length === 1 ? 'plan' : 'planes'}`}
        rightSlot={
          <Link
            href="/coach/library/plans/new"
            aria-label="Crear plan"
            style={{
              width: 40,
              height: 40,
              backgroundColor: '#B5F23D',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <Plus size={22} color="#0A0A0A" strokeWidth={2.5} />
          </Link>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 120px' }}>
        <PlanList plans={plans} />
      </div>
    </div>
  )
}
