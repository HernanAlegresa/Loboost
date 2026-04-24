import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoachSubpageHeader from '@/components/ui/coach-subpage-header'
import { getSessionDetailForCoach } from './queries'
import type { SessionExerciseDetail } from './queries'

const T = {
  bg: '#0A0A0A', card: '#111317', border: '#1F2227',
  lime: '#B5F23D', text: '#F0F0F0', muted: '#6B7280', secondary: '#9CA3AF',
} as const

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const LEVEL_COLORS = ['', '#F25252', '#F2994A', '#F2C94A', '#4CAF82', '#B5F23D'] as const

function SemanticDot({ level }: { level: number }) {
  const color = LEVEL_COLORS[Math.min(Math.max(level, 1), 5)] ?? '#6B7280'
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 9999,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  )
}

const ENERGY_LABELS = ['', 'Agotado', 'Bajo', 'Normal', 'Bien', 'Excelente']
const SLEEP_LABELS  = ['', 'Pésimo',  'Mal',  'Regular', 'Bien', 'Muy bien']
const SORENESS_LABELS = ['', 'Mucho', 'Bastante', 'Algo', 'Poco', 'Sin dolor']

function repsRange(min: number | null, max: number | null): string {
  if (min == null) return '—'
  if (max != null && max !== min) return `${min}–${max}`
  return String(min)
}

function ExerciseCard({ ex }: { ex: SessionExerciseDetail }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{ex.name}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
          {ex.plannedSets} series planificadas
          {ex.type === 'strength'
            ? ` · ${repsRange(ex.plannedRepsMin, ex.plannedRepsMax)} reps`
            : ex.plannedDurationSeconds != null
              ? ` · ${ex.plannedDurationSeconds}s`
              : ''}
        </p>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ex.sets.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Sin series registradas</p>
        ) : (
          ex.sets.map((set) => (
            <div
              key={set.setNumber}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 10px',
                backgroundColor: set.completed ? 'rgba(181,242,61,0.06)' : 'rgba(255,255,255,0.02)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: T.muted, minWidth: 52 }}>Serie {set.setNumber}</span>
              <span style={{ fontSize: 13, color: T.secondary, flex: 1 }}>
                {ex.type === 'strength'
                  ? set.weightKg != null
                    ? `${set.weightKg} kg × ${set.repsPerformed ?? '—'} reps`
                    : `— × ${set.repsPerformed ?? '—'} reps`
                  : set.durationSeconds != null
                    ? `${set.durationSeconds} seg`
                    : '—'}
              </span>
              {set.completed && (
                <span style={{ fontSize: 13, color: T.lime }}>✓</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: clientId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const session = await getSessionDetailForCoach(sessionId, clientId, user.id)
  if (!session) notFound()

  const date = new Date(session.date + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CoachSubpageHeader
        backHref={`/coach/clients/${clientId}/sessions`}
        title={`Semana ${session.weekNumber} · ${DAY_NAMES[session.dayOfWeek]}`}
        subtitle={date}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {(session.rpe != null ||
          session.notes ||
          session.energyLevel != null ||
          session.sleepQuality != null ||
          session.sorenessLevel != null) && (
          <div
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {session.rpe != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>RPE percibido</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.lime }}>
                  {session.rpe}/10
                </p>
              </div>
            )}
            {session.energyLevel != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Energía</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SemanticDot level={session.energyLevel} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>
                    {ENERGY_LABELS[session.energyLevel] ?? '—'}
                  </p>
                </div>
              </div>
            )}
            {session.sleepQuality != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Sueño</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SemanticDot level={session.sleepQuality} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>
                    {SLEEP_LABELS[session.sleepQuality] ?? '—'}
                  </p>
                </div>
              </div>
            )}
            {session.sorenessLevel != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Dolor muscular</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SemanticDot level={session.sorenessLevel} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>
                    {SORENESS_LABELS[session.sorenessLevel] ?? '—'}
                  </p>
                </div>
              </div>
            )}
            {session.notes && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: T.secondary,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 10,
                }}
              >
                &ldquo;{session.notes}&rdquo;
              </p>
            )}
          </div>
        )}

        {(() => {
          const totalPlanned = session.exercises.reduce((s, ex) => s + ex.plannedSets, 0)
          const totalCompleted = session.exercises.reduce(
            (s, ex) => s + ex.sets.filter((set) => set.completed).length,
            0
          )
          if (totalPlanned === 0) return null
          const pct = Math.round((totalCompleted / totalPlanned) * 100)
          const color = pct === 100 ? '#B5F23D' : '#F2C94A'
          return (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.muted,
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                EJERCICIOS
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>
                {totalCompleted}/{totalPlanned} series · {pct}%
              </p>
            </div>
          )
        })()}
        {session.exercises.map((ex) => (
          <ExerciseCard key={ex.clientPlanDayExerciseId} ex={ex} />
        ))}
      </div>
    </div>
  )
}
