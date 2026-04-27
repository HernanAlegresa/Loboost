import Link from 'next/link'
import {
  ChevronRight,
  ClipboardList,
  Dumbbell,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  MinusCircle,
} from 'lucide-react'
import type { ProgressKPIs } from './progress-queries'
import type { NavTileStats } from './progress-queries'
import type { ActivePlanSummary } from '@/features/clients/types'
import type { ClientStatus } from '@/features/clients/types/client-status'
import { CLIENT_STATUS_CONFIG } from '@/features/clients/types/client-status'
import ProgressOverview from './progress-overview'

type Props = {
  clientId: string
  progressKPIs: ProgressKPIs
  activePlan: ActivePlanSummary | null
  totalSessions: number
  progressSeries: Array<{ label: string; completed: number }>
  navTileStats: NavTileStats
  clientStatus: ClientStatus
}

const SECTION_OVERLINE: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 10,
  fontWeight: 400,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textAlign: 'center',
}

const STATUS_MESSAGES: Record<ClientStatus, string> = {
  'al-dia':    'Todos los entrenamientos registrados al día.',
  'atencion':  'Tiene días sin completar esta semana.',
  'riesgo':    'Semanas anteriores con registros faltando.',
  'sin-datos': 'Sin registros en ningún entrenamiento.',
}

const STATUS_ICONS: Record<ClientStatus, React.ReactNode> = {
  'al-dia':    <CheckCircle2 size={16} strokeWidth={2.5} />,
  'atencion':  <AlertTriangle size={16} strokeWidth={2.5} />,
  'riesgo':    <AlertOctagon size={16} strokeWidth={2.5} />,
  'sin-datos': <MinusCircle size={16} strokeWidth={2.5} />,
}

function StatusBanner({ status }: { status: ClientStatus }) {
  const cfg = CLIENT_STATUS_CONFIG[status]
  return (
    <div
      style={{
        backgroundColor: cfg.bg,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0, display: 'flex' }}>
        {STATUS_ICONS[status]}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
          {cfg.label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
          {STATUS_MESSAGES[status]}
        </p>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  valueColor = '#F0F0F0',
  subColor = '#9CA3AF',
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  subColor?: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '12px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          textAlign: 'center',
          margin: 0,
        }}
      >
        {value}
      </p>
      {sub ? (
        <p style={{ fontSize: 11, fontWeight: 600, color: subColor, textAlign: 'center', margin: 0 }}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

function NavTile({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: '#B5F23D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        </div>
        <ChevronRight size={18} color="#B5F23D" strokeWidth={2.5} style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}

function computeTrend(
  points: Array<{ completed: number }>
): { arrow: string; label: string; color: string } {
  if (points.length < 4) return { arrow: '→', label: 'Estable', color: '#6B7280' }
  const recent = points.slice(-2).reduce((s, p) => s + p.completed, 0)
  const prior = points.slice(-4, -2).reduce((s, p) => s + p.completed, 0)
  if (recent > prior) return { arrow: '↑', label: 'Subiendo', color: '#B5F23D' }
  if (recent < prior) return { arrow: '↓', label: 'Bajando', color: '#F2C94A' }
  return { arrow: '→', label: 'Estable', color: '#6B7280' }
}

export default function ClientProgressContent({
  clientId,
  progressKPIs,
  activePlan,
  progressSeries,
  clientStatus,
}: Props) {
  const { weightInitialKg, weightCurrentKg, weightDeltaKg, checkInsSubmitted, checkInsExpected } =
    progressKPIs

  const deltaStr =
    weightDeltaKg !== null ? `${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg` : null
  const deltaColor =
    weightDeltaKg == null
      ? '#9CA3AF'
      : weightDeltaKg > 0
        ? '#F2994A'
        : weightDeltaKg < 0
          ? '#B5F23D'
          : '#9CA3AF'

  const trend = computeTrend(progressSeries)
  const showTrend = progressSeries.length >= 4

  // If plan has ended (today past endDate), currentWeek is capped at totalWeeks
  // → set index beyond array length so all bars render as past (green)
  const planEnded = activePlan
    ? new Date() > new Date(activePlan.endDate + 'T23:59:59Z')
    : false
  const currentWeekIndex = activePlan
    ? planEnded
      ? activePlan.weeks        // all bars past
      : activePlan.currentWeek - 1  // 0-indexed
    : -1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Estado operativo */}
      <StatusBanner status={clientStatus} />

      {/* Resumen KPIs */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: 35, margin: '0 auto', width: 'fit-content' }}>
          <KpiCard
            label="Peso inicial"
            value={weightInitialKg !== null ? `${weightInitialKg} kg` : '—'}
          />
          <KpiCard
            label="Peso actual"
            value={weightCurrentKg !== null ? `${weightCurrentKg} kg` : '—'}
            valueColor="#B5F23D"
            sub={deltaStr ?? undefined}
            subColor={deltaColor}
          />
          <KpiCard
            label="Check-ins"
            value={`${checkInsSubmitted}/${checkInsExpected}`}
          />
        </div>
      </div>

      {/* Actividad semanal */}
      {progressSeries.length > 0 && (
        <div style={{ paddingTop: 10 }}>
          <p style={SECTION_OVERLINE}>Actividad semanal / sesiones completadas</p>
          <ProgressOverview
            points={progressSeries}
            currentWeekIndex={currentWeekIndex}
            trendArrow={showTrend ? trend.arrow : undefined}
            trendLabel={showTrend ? trend.label : undefined}
            trendColor={showTrend ? trend.color : undefined}
          />
        </div>
      )}

      {/* Seguimiento */}
      <div>
        {activePlan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, maxWidth: 320, margin: '0 auto', width: '100%', paddingTop: 10 }}>
            <NavTile
              href={`/coach/clients/${clientId}/check-ins`}
              icon={<ClipboardList size={20} color="#0A0A0A" />}
              title="Check-ins semanales"
              subtitle="Peso registrado semana a semana"
            />
            <NavTile
              href={`/coach/clients/${clientId}/exercises-progress`}
              icon={<Dumbbell size={20} color="#0A0A0A" />}
              title="Progreso de ejercicios"
              subtitle="Evolución de carga por ejercicio"
            />
            <NavTile
              href={`/coach/clients/${clientId}/weekly-load`}
              icon={<BarChart2 size={20} color="#0A0A0A" />}
              title="Carga semanal"
              subtitle="Volumen, intensidad y tonelaje"
            />
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#111317',
              border: '1px solid #1F2227',
              borderRadius: 14,
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
              Asigná un plan activo para abrir check-ins, progreso por ejercicio y carga semanal.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
