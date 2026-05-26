import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanDetailFull } from '../queries'
import PlanTemplateViewer from './plan-template-viewer'

type Props = { params: Promise<{ id: string }> }

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const plan = await getPlanDetailFull(user.id, id)
  if (!plan) notFound()

  return <PlanTemplateViewer plan={plan} />
}
