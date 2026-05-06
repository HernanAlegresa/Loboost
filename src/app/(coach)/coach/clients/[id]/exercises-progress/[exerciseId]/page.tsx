import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getExerciseWeeklyHistory } from '../../progress-queries'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import ExerciseWeekGrid from './exercise-week-grid'
import RefreshOnFocus from './refresh-on-focus'

// ── PR strip ──────────────────────────────────────────────────────────────────

function PRStrip({ peakTopSetKg }: { peakTopSetKg: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 0' }}>
      <div
        style={{
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: 'rgba(181,242,61,0.08)',
          borderRadius: 12,
          padding: '12px 18px',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
          ★
        </span>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#B5F23D',
            margin: 0,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Récord personal
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', margin: 0, lineHeight: 1, textAlign: 'center' }}>
          {peakTopSetKg}{' '}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#9CA3AF' }}>kg</span>
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string; exerciseId: string }>
}) {
  const { id, exerciseId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const basic = await getClientBasicForCoach(id, user.id)
  if (!basic) notFound()

  const { fullName, activePlan } = basic

  if (!activePlan) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlowHeaderConfig title="Ejercicio" fallbackHref={`/coach/clients/${id}/exercises-progress`} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>Sin plan activo.</p>
        </div>
      </div>
    )
  }

  const history = await getExerciseWeeklyHistory(id, exerciseId, activePlan)
  if (!history) notFound()

  const { exerciseName, muscleGroup, weeks, peakTopSetKg, isBodyweight, currentPlanWeek } = history

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RefreshOnFocus />
      <FlowHeaderConfig title={exerciseName} fallbackHref={`/coach/clients/${id}/exercises-progress`} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV,
        }}
      >
        {/* Subtitle */}
        <div style={{ padding: '0 20px 30px' }}>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0, textAlign: 'center' }}>
            <span style={{ fontWeight: 700, color: '#F0F0F0' }}>{muscleGroupLabel(muscleGroup)}</span>
            {isBodyweight && ' · Sin carga'} · {activePlan.name}
          </p>
        </div>

        {weeks.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#4B5563' }}>
              Este ejercicio no está asignado en el plan aún.
            </p>
          </div>
        ) : (
          <>
            {/* PR strip */}
            {!isBodyweight && peakTopSetKg !== null && <PRStrip peakTopSetKg={peakTopSetKg} />}

            {/* Weekly grid */}
            <div style={{ padding: '40px 0 0' }}>
              <ExerciseWeekGrid
                weeks={weeks}
                currentPlanWeek={currentPlanWeek}
                isBodyweight={isBodyweight}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
