'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react'
import {
  setupClientPlanAction,
  type SetupClientPlanState,
} from '@/features/plans/actions/setup-client-plan'
import { FlowHeaderConfig } from '@/components/ui/header-context'

const FORM_ID = 'setup-client-plan-form'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function getTodayISO(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]!
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-') as [string, string, string]
  return `${d}/${m}/${y}`
}

function getFirstDayOfMonthDow(year: number, month: number): number {
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  return dow === 0 ? 6 : dow - 1
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

type Props = {
  clientId: string
  clientName: string
  template: { id: string; name: string; weeks: number }
}

export default function SetupClientPlanForm({ clientId, clientName, template }: Props) {
  const router = useRouter()
  const today = getTodayISO()
  const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number]

  const [planName, setPlanName] = useState(template.name)
  const [weeks, setWeeks] = useState(template.weeks)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calYear, setCalYear] = useState(todayYear)
  const [calMonth, setCalMonth] = useState(todayMonth)

  const endDate = useMemo(() => {
    if (!selectedDate) return null
    return addDays(selectedDate, weeks * 7 - 1)
  }, [selectedDate, weeks])

  const [state, formAction, isPending] = useActionState<SetupClientPlanState, FormData>(
    setupClientPlanAction,
    null
  )

  useEffect(() => {
    if (!state?.success) return
    router.push(`/coach/clients/${clientId}/plan/edit?stage=2&from=assign`)
  }, [state, router, clientId])

  useEffect(() => {
    if (!state || state.success) return
    if (state.reason === 'template_missing') {
      router.replace(`/coach/clients/${clientId}/assign?setupError=template_missing`)
    }
  }, [state, router, clientId])

  const canSubmit = planName.trim().length > 0 && !!selectedDate && !isPending

  const saveButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canSubmit}
      aria-label={canSubmit ? 'Asignar plan' : 'Completá todos los campos'}
      aria-busy={isPending}
      style={{
        flexShrink: 0,
        width: 38,
        height: 38,
        padding: 0,
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: canSubmit ? '#B5F23D' : '#3D4047',
        cursor: canSubmit ? 'pointer' : 'not-allowed',
      }}
    >
      {isPending ? (
        <Loader2
          size={19}
          color="#0A0A0A"
          aria-hidden
          style={{ animation: 'setupSpin 0.75s linear infinite' }}
        />
      ) : (
        <Check size={21} strokeWidth={2.5} color={canSubmit ? '#0A0A0A' : '#6B7280'} aria-hidden />
      )}
    </button>
  )

  const firstDow = getFirstDayOfMonthDow(calYear, calMonth)
  const daysInMonth = getDaysInMonth(calYear, calMonth)

  const todayDowIndex = (() => {
    const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
    const dow = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay()
    return dow === 0 ? 6 : dow - 1
  })()

  function prevMonth() {
    if (calMonth === 1) {
      setCalYear((y) => y - 1)
      setCalMonth(12)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (calMonth === 12) {
      setCalYear((y) => y + 1)
      setCalMonth(1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  function selectDay(day: number) {
    const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate((prev) => (prev === iso ? null : iso))
  }

  return (
    <div
      style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <style>{`@keyframes setupSpin { to { transform: rotate(360deg); } }`}</style>

      <FlowHeaderConfig
        title="Configurar plan"
        fallbackHref={`/coach/clients/${clientId}/assign`}
        rightSlot={saveButton}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
        }}
      >
        <form
          id={FORM_ID}
          action={formAction}
          style={{ padding: '20px 20px 140px', display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="templateId" value={template.id} />
          <input type="hidden" name="weeks" value={weeks} />
          <input type="hidden" name="startDate" value={selectedDate ?? ''} />

          <div
            style={{
              borderRadius: 12,
              padding: '0 14px 4px',
            }}
          >
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
              Cliente
            </p>
            <p style={{ fontSize: 14, color: '#F0F0F0', margin: '4px 0 0', fontWeight: 600, textAlign: 'center' }}>
              {clientName}
            </p>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="plan-name"
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#F0F0F0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Nombre del plan
            </label>
            <input
              id="plan-name"
              name="name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Nombre del plan…"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#111317',
                border: '1px solid #2A2D34',
                borderRadius: 12,
                padding: '0 14px',
                color: '#F0F0F0',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Weeks stepper */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#F0F0F0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '0 0 14px',
              }}
            >
              Duración
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={() => setWeeks((w) => Math.max(1, w - 1))}
                aria-label="Reducir semanas"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.90)',
                  color: weeks === 1 ? '#9CA3AF' : '#0A0A0A',
                  cursor: weeks === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Minus size={22} strokeWidth={3.2} />
              </button>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#F0F0F0', lineHeight: 1 }}>
                  {weeks}
                </span>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
                  {weeks === 1 ? 'semana' : 'semanas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeeks((w) => Math.min(60, w + 1))}
                aria-label="Aumentar semanas"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#FFFFFF',
                  color: weeks === 60 ? '#9CA3AF' : '#0A0A0A',
                  cursor: weeks === 60 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Plus size={22} strokeWidth={3.2} />
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#F0F0F0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '0 0 12px',
              }}
            >
              Fecha de inicio
            </p>

            <div
              style={{
                backgroundColor: '#111317',
                borderRadius: 12,
                padding: '16px 14px',
                border: '1px solid #2A2D34',
              }}
            >
              {/* Month nav */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 50,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Mes anterior"
                  style={{ background: 'none', border: 'none', color: '#F0F0F0', cursor: 'pointer', padding: 6 }}
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Mes siguiente"
                  style={{ background: 'none', border: 'none', color: '#F0F0F0', cursor: 'pointer', padding: 6 }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: i === todayDowIndex ? '#B5F23D' : '#6B7280',
                      padding: '4px 0',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isStart = iso === selectedDate
                  const isEnd = !!endDate && iso === endDate
                  const isInRange = !!selectedDate && !!endDate && iso > selectedDate && iso < endDate
                  const isToday = iso === today
                  const isPast = iso < today

                  const bgColor = isStart
                    ? '#B5F23D'
                    : isEnd
                    ? 'rgba(181,242,61,0.22)'
                    : isInRange
                    ? 'rgba(181,242,61,0.07)'
                    : 'transparent'

                  const textColor = isStart
                    ? '#0A0A0A'
                    : isEnd || isToday
                    ? '#B5F23D'
                    : isPast
                    ? '#4B5563'
                    : '#F0F0F0'

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      aria-label={`${day} de ${MONTH_NAMES[calMonth - 1]}`}
                      aria-pressed={isStart}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '50%',
                        border: isEnd ? '1.5px solid #B5F23D' : 'none',
                        backgroundColor: bgColor,
                        color: textColor,
                        fontSize: 13,
                        fontWeight: isStart || isEnd || isToday ? 700 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Date range summary */}
              {selectedDate && endDate && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid #2A2D34',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#B5F23D' }}>
                    {formatDateDisplay(selectedDate)}
                  </span>
                  <span style={{ fontSize: 16, color: '#F0F0F0', fontWeight: 900, lineHeight: 1 }}>→</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#B5F23D' }}>
                    {formatDateDisplay(endDate)}
                  </span>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '10px 2px 0', lineHeight: 1.5 }}>
              La fecha de fin es informativa y se calcula automáticamente según inicio + semanas.
            </p>
          </div>

          {state && !state.success && (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(242, 82, 82, 0.08)',
                border: '1px solid rgba(242, 82, 82, 0.25)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <p style={{ fontSize: 13, color: '#F25252', lineHeight: 1.45, margin: 0 }}>
                {state.error}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
