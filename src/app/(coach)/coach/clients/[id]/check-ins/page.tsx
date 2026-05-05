import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientBasicForCoach, getCheckInsSummary } from '../progress-queries'
import { FlowHeaderConfig } from '@/components/ui/header-context'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import { CheckCircle2, Clock, Lock } from 'lucide-react'
import type { CheckInWeek } from '../progress-queries'

function computeCheckInSummary(
  weeks: CheckInWeek[],
  currentWeek: number
): { registered: number; pending: number; missed: number } {
  let registered = 0
  let pending = 0
  let missed = 0
  for (const week of weeks) {
    if (week.isFuture) continue
    if (week.entry !== null) {
      registered++
    } else if (week.weekNumber === currentWeek) {
      pending++
    } else {
      missed++
    }
  }
  return { registered, pending, missed }
}

function SummaryPill({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div
      style={{
        flex: '0 0 86px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '8px 6px',
      }}
    >
      <span style={{ fontSize: 25, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default async function CheckInsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
        <FlowHeaderConfig title="Check-ins" fallbackHref={`/coach/clients/${id}?tab=progress`} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p style={{ fontSize: 14, color: '#4B5563', textAlign: 'center' }}>
            Sin plan activo. Asigna un plan para registrar check-ins.
          </p>
        </div>
      </div>
    )
  }

  const summary = await getCheckInsSummary(id, activePlan)
  const checkInCounts = computeCheckInSummary(summary.weeks, summary.currentWeek)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FlowHeaderConfig title="Check-ins" fallbackHref={`/coach/clients/${id}?tab=progress`} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV,
        }}
      >
        {/* Plan name — centred, lime */}
        <p
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#5B6472',
            textAlign: 'center',
            margin: 0,
            padding: '12px 20px 30px',
          }}
        >
          {activePlan.name}
        </p>

        {/* Summary strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 30, padding: '0 20px 16px' }}>
          <SummaryPill value={checkInCounts.registered} label="Registradas" color="#B5F23D" />
          <SummaryPill value={checkInCounts.pending}    label="Pendiente"   color="#F2C94A" />
          <SummaryPill value={checkInCounts.missed}     label="Sin registrar" color="#F25252" />
        </div>

        {/* Week list */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 20px 0' }}>
          {summary.weeks.map((week, idx) => (
            <CheckInWeekRow
              key={week.weekNumber}
              week={week}
              currentWeek={summary.currentWeek}
              isFirst={idx === 0}
              isLast={idx === summary.weeks.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}


function formatDateRange(start: string, end: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  return `${s.getUTCDate()} ${months[s.getUTCMonth()]} – ${e.getUTCDate()} ${months[e.getUTCMonth()]}`
}

function formatDate(dateStr: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

function CheckInWeekRow({
  week,
  currentWeek,
  isFirst,
  isLast,
}: {
  week: CheckInWeek
  currentWeek: number
  isFirst: boolean
  isLast: boolean
}) {
  const isCurrent = week.weekNumber === currentWeek
  const isPast = week.weekNumber < currentWeek
  const hasEntry = week.entry !== null

  let statusIcon: ReactNode
  let statusColor: string
  let statusLabel: string

  if (week.isFuture) {
    statusIcon = <Lock size={14} color="#4B5563" />
    statusColor = '#4B5563'
    statusLabel = 'Futura'
  } else if (hasEntry) {
    statusIcon = <CheckCircle2 size={14} color="#B5F23D" />
    statusColor = '#B5F23D'
    statusLabel = week.entry!.weightKg !== null ? `${week.entry!.weightKg} kg` : 'Registrado'
  } else if (isCurrent) {
    statusIcon = <Clock size={14} color="#F2C94A" />
    statusColor = '#F2C94A'
    statusLabel = 'Pendiente'
  } else if (isPast) {
    statusIcon = <Clock size={14} color="#F25252" />
    statusColor = '#F25252'
    statusLabel = 'Sin registrar'
  } else {
    statusIcon = <Clock size={14} color="#6B7280" />
    statusColor = '#6B7280'
    statusLabel = 'Pendiente'
  }

  const dotColor = hasEntry
    ? '#B5F23D'
    : week.isFuture
      ? '#252A31'
      : isCurrent
        ? '#F2C94A'
        : isPast
          ? '#F25252'
          : '#252A31'

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
      {/* Timeline column: top-line | dot | bottom-line
          Lines split space equally → dot always centred with card */}
      <div
        style={{
          width: 20,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: 2, flex: 1, background: isFirst ? 'transparent' : '#1F2227' }} />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <div style={{ width: 2, flex: 1, background: isLast ? 'transparent' : '#1F2227' }} />
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '12px 0',
        }}
      >
        <div
          style={{
            background: isCurrent
              ? 'linear-gradient(160deg, #14181E 0%, #111317 100%)'
              : 'transparent',
            border: isCurrent ? '1px solid #252A31' : '1px solid transparent',
            borderRadius: 14,
            padding: isCurrent ? '12px 14px' : '0',
          }}
        >
          {/* Row header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isCurrent ? '#F0F0F0' : week.isFuture ? '#4B5563' : '#9CA3AF',
                  margin: 0,
                }}
              >
                Semana {week.weekNumber}
                {isCurrent && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#B5F23D',
                      background: 'rgba(181,242,61,0.12)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Actual
                  </span>
                )}
              </p>
              <p style={{ fontSize: 11, color: '#4B5563', margin: '3px 0 0' }}>
                {formatDateRange(week.weekStartDate, week.weekEndDate)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {statusIcon}
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
            </div>
          </div>

          {/* Entry details */}
          {hasEntry && week.entry!.notes && (
            <p
              style={{
                fontSize: 12,
                color: '#6B7280',
                margin: '8px 0 0',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{week.entry!.notes}&rdquo;
            </p>
          )}
          {hasEntry && (
            <p style={{ fontSize: 11, color: '#4B5563', margin: '4px 0 0' }}>
              Registrado el {formatDate(week.entry!.date)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

