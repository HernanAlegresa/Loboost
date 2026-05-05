import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Pencil, UserPlus } from 'lucide-react'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import { getPlanDetailFull } from '../queries'
import WeekCollapsibleCard from './week-collapsible-card'

type Props = { params: Promise<{ id: string }> }

const T = {
  bg: '#0A0A0A',
  card: '#111317',
  border: '#1F2227',
  lime: '#B5F23D',
  text: '#F0F0F0',
  muted: '#6B7280',
  secondary: '#9CA3AF',
} as const


const btnPrimary: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', minHeight: 50, borderRadius: 12, border: 'none',
  fontSize: 15, fontWeight: 700, color: '#0A0A0A', backgroundColor: '#B5F23D',
  textDecoration: 'none', cursor: 'pointer',
}

const btnSecondary: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', minHeight: 50, borderRadius: 12, border: '1px solid #2A2D34',
  fontSize: 15, fontWeight: 600, color: '#F0F0F0', backgroundColor: '#111317',
  textDecoration: 'none', cursor: 'pointer',
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const plan = await getPlanDetailFull(user.id, id)
  if (!plan) notFound()

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FlowHeaderConfig
        title={plan.name}
        subtitle={`${plan.weeks} ${plan.weeks === 1 ? 'semana' : 'semanas'}`}
        fallbackHref="/coach/library?tab=plans"
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', padding: '16px 20px 120px' }}>
        {plan.description && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: T.secondary, margin: 0, lineHeight: 1.5 }}>{plan.description}</p>
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>ACCIONES</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          <Link href={`/coach/library/plans/${plan.id}/edit`} style={btnPrimary}>
            <Pencil size={18} color="#0A0A0A" /> Editar plan
          </Link>
          <Link href={`/coach/library/plans/${plan.id}/assign`} style={btnSecondary}>
            <UserPlus size={18} color="#B5F23D" /> Asignar a un cliente
          </Link>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', marginBottom: 12 }}>ESTRUCTURA DEL PLAN</p>
        {plan.planWeeks.map((week) => (
          <WeekCollapsibleCard key={week.id} week={week} />
        ))}
      </div>
    </div>
  )
}
