import type { ActivePlanSummary } from '@/features/clients/types'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#B5F23D',
  completed: '#6B7280',
  paused: '#F2994A',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

export default function PlanCard({ activePlan }: { activePlan: ActivePlanSummary | null }) {
  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  if (!activePlan) {
    return (
      <div>
        <p style={SECTION_TITLE}>Plan activo</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}>Sin plan asignado</p>
          <button
            disabled
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#4B5563',
              backgroundColor: 'transparent',
              border: '1px solid #2A2D34',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'not-allowed',
            }}
          >
            + Asignar plan
          </button>
        </div>
      </div>
    )
  }

  const progressPct = Math.max(8, Math.round(((activePlan.currentWeek - 1) / activePlan.weeks) * 100))
  const statusColor = STATUS_COLORS[activePlan.status] ?? '#6B7280'

  return (
    <div>
      <p style={SECTION_TITLE}>Plan activo</p>
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {activePlan.name}
          </p>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              color: statusColor,
              backgroundColor: `${statusColor}1A`,
              padding: '3px 8px',
              borderRadius: 9999,
            }}
          >
            {STATUS_LABELS[activePlan.status] ?? activePlan.status}
          </span>
        </div>

        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
          Semana {activePlan.currentWeek} de {activePlan.weeks}
          {' · '}
          {formatDate(activePlan.startDate)} {'->'} {formatDate(activePlan.endDate)}
        </p>

        <div
          style={{
            backgroundColor: '#1F2227',
            borderRadius: 9999,
            height: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: '#B5F23D',
              borderRadius: 9999,
            }}
          />
        </div>
        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'right' }}>{progressPct}%</p>
      </div>
    </div>
  )
}
