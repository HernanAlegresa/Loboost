'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react'
import {
  updateClientPlanMetaAction,
  type UpdateClientPlanMetaState,
} from '@/features/plans/actions/update-client-plan-meta'
import { FlowHeaderConfig } from '@/components/ui/header-context'

const FORM_ID = 'edit-client-plan-meta-form'

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

function parseInitialMonth(iso: string | null): { year: number; month: number } {
  if (!iso) {
    const now = new Date()
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
  }
  const [y, m] = iso.split('-').map(Number) as [number, number]
  return { year: y, month: m }
}

type Props = {
  clientId: string
  clientPlanId: string
  planName: string
  weeks: number
  startDate: string | null
}

export default function EditClientPlanMetaForm({
  clientId,
  clientPlanId,
  planName: initialName,
  weeks: initialWeeks,
  startDate: initialStartDate,
}: Props) {
  const router = useRouter()
  const today = getTodayISO()

  const initMonth = parseInitialMonth(initialStartDate)

  const [planName, setPlanName] = useState(initialName)
  const [weeks, setWeeks] = useState(initialWeeks)
  const [selectedDate, setSelectedDate] = useState<string | null>(initialStartDate)
  const [calYear, setCalYear] = useState(initMonth.year)
  const [calMonth, setCalMonth] = useState(initMonth.month)

  const endDate = useMemo(() => {
    if (!selectedDate) return null
    return addDays(selectedDate, weeks * 7 - 1)
  }, [selectedDate, weeks])

  const isDirty =
    planName.trim() !== initialName ||
    weeks !== initialWeeks ||
    selectedDate !== initialStartDate

  const [state, formAction, isPending] = useActionState<UpdateClientPlanMetaState, FormData>(
    updateClientPlanMetaAction,
    null
  )

  useEffect(() => {
    if (!state?.success) return
    router.push(`/coach/clients/${clientId}/plan/edit?stage=2`)
  }, [state, router, clientId])

  const canProceed = planName.trim().length > 0 && !!selectedDate && !isPending

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isDirty) {
      e.preventDefault()
      router.push(`/coach/clients/${clientId}/plan/edit?stage=2`)
    }
  }

  const continueButton = (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!canProceed}
      aria-label={canProceed ? (isDirty ? 'Guardar y continuar' : 'Continuar') : 'Completá todos los campos'}
      aria-busy={isPending}
      style={{
        flexShrink: 0,
        height: 36,
        padding: '0 14px',
        borderRadius: 20,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: canProceed ? '#B5F23D' : '#3D4047',
        cursor: canProceed ? 'pointer' : 'not-allowed',
        fontSize: 13,
        fontWeight: 700,
        color: canProceed ? '#0A0A0A' : '#6B7280',
        whiteSpace: 'nowrap',
      }}
    >
      {isPending ? (
        <Loader2
          size={16}
          color="#0A0A0A"
          aria-hidden
          style={{ animation: 'ecpmfSpin 0.75s linear infinite' }}
        />
      ) : (
        <>
          {isDirty ? 'Guardar' : 'Continuar'}
          <ArrowRight size={15} strokeWidth={2.5} aria-hidden />
        </>
      )}
    </button>
  )

  const firstDow = getFirstDayOfMonthDow(calYear, calMonth)
  const daysInMonth = getDaysInMonth(calYear, calMonth)

  function prevMonth() {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12) }
    else setCalMonth((m) => m - 1)
  }

  function nextMonth() {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1) }
    else setCalMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate((prev) => (prev === iso ? null : iso))
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@keyframes ecpmfSpin { to { transform: rotate(360deg); } }`}</style>

      <FlowHeaderConfig
        title="Configurar plan"
        subtitle={initialName}
        fallbackHref={`/coach/clients/${clientId}`}
        rightSlot={continueButton}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
        <form
          id={FORM_ID}
          action={formAction}
          onSubmit={handleSubmit}
          style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <input type="hidden" name="clientPlanId" value={clientPlanId} />
          <input type="hidden" name="weeks" value={weeks} />
          <input type="hidden" name="startDate" value={selectedDate ?? ''} />

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
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#F0F0F0',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}>
              Duración
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button
                type="button"
                onClick={() => setWeeks((w) => Math.max(1, w - 1))}
                aria-label="Reducir semanas"
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid #2A2D34', background: '#111317',
                  color: weeks === 1 ? '#4B5563' : '#F0F0F0',
                  cursor: weeks === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Minus size={18} />
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
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
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid #2A2D34', background: '#111317',
                  color: weeks === 60 ? '#4B5563' : '#F0F0F0',
                  cursor: weeks === 60 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, color: '#F0F0F0',
              letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px',
            }}>
              Fecha de inicio
            </p>
            <div style={{
              backgroundColor: '#111317', borderRadius: 16,
              padding: '16px 14px', border: '1px solid #1F2227',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button
                  type="button" onClick={prevMonth} aria-label="Mes anterior"
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 6 }}
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </span>
                <button
                  type="button" onClick={nextMonth} aria-label="Mes siguiente"
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 6 }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {DAY_LABELS.map((label, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6B7280', padding: '4px 0' }}>
                    {label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = iso === selectedDate
                  const isToday = iso === today
                  const isPast = iso < today
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      aria-label={`${day} de ${MONTH_NAMES[calMonth - 1]}`}
                      aria-pressed={isSelected}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '50%',
                        border: isToday && !isSelected ? '1px solid rgba(181,242,61,0.5)' : 'none',
                        backgroundColor: isSelected ? '#B5F23D' : 'transparent',
                        color: isSelected ? '#0A0A0A' : isPast ? '#4B5563' : '#F0F0F0',
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? 700 : 400,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {selectedDate && endDate && (
                <div style={{
                  marginTop: 16, paddingTop: 14, borderTop: '1px solid #1F2227',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0' }}>
                    {formatDateDisplay(selectedDate)}
                  </span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>→</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#B5F23D' }}>
                    {formatDateDisplay(endDate)}
                  </span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    ({weeks} {weeks === 1 ? 'sem' : 'sems'})
                  </span>
                </div>
              )}
            </div>
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
