import Link from 'next/link'
import { ChevronRight, ClipboardList, Dumbbell, BarChart2 } from 'lucide-react'
import type { ProgressKPIs } from './progress-queries'
import type { ActivePlanSummary } from '@/features/clients/types'

type Props = {
  clientId: string
  progressKPIs: ProgressKPIs
  activePlan: ActivePlanSummary | null
  totalSessions?: number
}

function KpiItem({
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
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '18px 8px',
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
          fontSize: 24,
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
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: subColor,
            textAlign: 'center',
            margin: 0,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  )
}

function KpiDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 44,
        background: '#252A31',
        flexShrink: 0,
        alignSelf: 'center',
      }}
    />
  )
}

function NavTile({
  href,
  iconBg,
  icon,
  title,
  subtitle,
}: {
  href: string
  iconBg: string
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'linear-gradient(160deg, #12161C 0%, #0F1217 100%)',
          border: '1px solid #252A31',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: iconBg,
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
        <ChevronRight size={18} color="#F0F0F0" strokeWidth={2.5} style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}

export default function ClientProgressContent({
  clientId,
  progressKPIs,
  activePlan,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 3 KPI items with vertical dividers, no card backgrounds */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <KpiItem
          label="Peso inicial"
          value={weightInitialKg !== null ? `${weightInitialKg} kg` : '—'}
        />
        <KpiDivider />
        <KpiItem
          label="Peso actual"
          value={weightCurrentKg !== null ? `${weightCurrentKg} kg` : '—'}
          valueColor="#B5F23D"
          sub={deltaStr ?? undefined}
          subColor={deltaColor}
        />
        <KpiDivider />
        <KpiItem
          label="Check-ins"
          value={`${checkInsSubmitted}/${checkInsExpected}`}
        />
      </div>

      {/* Nav tiles */}
      {activePlan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <NavTile
            href={`/coach/clients/${clientId}/check-ins`}
            iconBg="rgba(181,242,61,0.12)"
            icon={<ClipboardList size={20} color="#B5F23D" />}
            title="Check-ins semanales"
            subtitle="Peso registrado semana a semana"
          />
          <NavTile
            href={`/coach/clients/${clientId}/exercises-progress`}
            iconBg="rgba(99,179,237,0.12)"
            icon={<Dumbbell size={20} color="#63B3ED" />}
            title="Progreso de ejercicios"
            subtitle="Evolución de carga por ejercicio"
          />
          <NavTile
            href={`/coach/clients/${clientId}/weekly-load`}
            iconBg="rgba(246,173,85,0.12)"
            icon={<BarChart2 size={20} color="#F6AD55" />}
            title="Carga semanal"
            subtitle="Volumen, intensidad y tonelaje"
          />
        </div>
      ) : (
        <div
          style={{
            background: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: '28px 20px',
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563' }}>
            Asigna un plan activo para ver el progreso del cliente.
          </p>
        </div>
      )}
    </div>
  )
}
