import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getExerciseSessionHistory } from '../../progress-queries'
import { muscleGroupLabel } from '@/features/exercises/muscle-groups'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import Avatar from '@/components/ui/avatar'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import { formatDateShort } from '../../date-utils'
import type { ExerciseSessionPoint } from '../../progress-queries'

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ sessions, isBodyweight }: { sessions: ExerciseSessionPoint[]; isBodyweight: boolean }) {
  const values = sessions.map((s) => (isBodyweight ? s.completedSets : s.topSetKg ?? 0))
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 120
  const H = 36
  const pad = 4

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="#B5F23D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const [lx, ly] = pts[pts.length - 1].split(',').map(Number)
        return <circle cx={lx} cy={ly} r={2.5} fill="#B5F23D" />
      })()}
    </svg>
  )
}

// ── PR strip ──────────────────────────────────────────────────────────────────

function PRStrip({ peakTopSetKg }: { peakTopSetKg: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(181,242,61,0.08)',
        border: '1px solid rgba(181,242,61,0.2)',
        borderRadius: 12,
        padding: '12px 14px',
        margin: '0 20px 4px',
      }}
    >
      <span style={{ fontSize: 16 }}>★</span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#B5F23D', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Récord personal
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', margin: '2px 0 0', lineHeight: 1 }}>
          {peakTopSetKg} <span style={{ fontSize: 14, fontWeight: 500, color: '#9CA3AF' }}>kg</span>
        </p>
      </div>
    </div>
  )
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session, isBodyweight }: { session: ExerciseSessionPoint; isBodyweight: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #1A1E24',
        gap: 12,
      }}
    >
      {/* Week badge */}
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#12161C',
          border: '1px solid #252A31',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.04em' }}>
          S{session.weekNumber}
        </span>
      </div>

      {/* Date + sets */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>
          {formatDateShort(session.date)}
        </p>
        <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
          {session.completedSets} {session.completedSets === 1 ? 'serie' : 'series'}
        </p>
      </div>

      {/* Weight / PR */}
      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isBodyweight && session.topSetKg !== null && (
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
            {session.topSetKg} <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>kg</span>
          </p>
        )}
        {session.isPR && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#B5F23D',
              background: 'rgba(181,242,61,0.1)',
              borderRadius: 6,
              padding: '2px 7px',
            }}
          >
            ★ PR
          </span>
        )}
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
        <CoachSubpageHeader
          backHref={`/coach/clients/${id}/exercises-progress`}
          title="Ejercicio"
          backColor="#B5F23D"
          rightSlot={<Avatar fullName={fullName} size="md" />}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>Sin plan activo.</p>
        </div>
      </div>
    )
  }

  const history = await getExerciseSessionHistory(id, exerciseId, activePlan)
  if (!history) notFound()

  const { exerciseName, muscleGroup, sessions, peakTopSetKg, isBodyweight } = history

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${id}/exercises-progress`}
        title={exerciseName}
        backColor="#B5F23D"
        titleSize={18}
        rightSlot={<Avatar fullName={fullName} size="md" />}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV,
        }}
      >
        {/* Subtitle */}
        <div style={{ padding: '12px 20px 0' }}>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            {muscleGroupLabel(muscleGroup)}{isBodyweight && ' · Sin carga'} · {activePlan.name}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#4B5563' }}>
              Sin sesiones completadas para este ejercicio.
            </p>
          </div>
        ) : (
          <>
            {/* PR strip */}
            {!isBodyweight && peakTopSetKg !== null && (
              <div style={{ padding: '14px 0 0' }}>
                <PRStrip peakTopSetKg={peakTopSetKg} />
              </div>
            )}

            {/* Sparkline */}
            {sessions.length >= 2 && (
              <div
                style={{
                  margin: '14px 20px 0',
                  background: 'linear-gradient(160deg,#12161C 0%,#0F1217 100%)',
                  border: '1px solid #252A31',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tendencia
                  </p>
                  <p style={{ fontSize: 12, color: '#4B5563', margin: '4px 0 0' }}>
                    {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}
                  </p>
                </div>
                <Sparkline sessions={sessions} isBodyweight={isBodyweight} />
              </div>
            )}

            {/* Session list */}
            <div style={{ padding: '14px 20px 0' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#4B5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 4px',
                }}
              >
                Historial
              </p>
              {[...sessions].reverse().map((session) => (
                <SessionRow key={session.sessionId} session={session} isBodyweight={isBodyweight} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
