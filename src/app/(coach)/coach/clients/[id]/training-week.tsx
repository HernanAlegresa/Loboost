'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react'
import { getWeekTrainingData } from './actions'
import type { TrainingWeekData, DayTrainingData, DayStatus } from '@/features/clients/types'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type PillStyle = { bg: string; text: string; border: string }

const PILL_STYLES: Record<DayStatus, PillStyle> = {
  completed: { bg: '#B5F23D', text: '#0A0A0A', border: '#B5F23D' },
  in_progress: { bg: '#F2994A', text: '#0A0A0A', border: '#F2994A' },
  today: { bg: 'transparent', text: '#F0F0F0', border: '#F0F0F0' },
  upcoming: { bg: 'transparent', text: '#4B5563', border: '#2A2D34' },
  past_missed: { bg: 'transparent', text: '#F25252', border: '#F25252' },
  rest: { bg: 'transparent', text: '#2A2D34', border: 'transparent' },
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 10,
}

function getDefaultDay(days: DayTrainingData[]): number {
  const active = days.find((d) => d.status === 'today' || d.status === 'in_progress')
  if (active) return active.dayOfWeek
  const lastCompleted = [...days].reverse().find((d) => d.status === 'completed')
  if (lastCompleted) return lastCompleted.dayOfWeek
  const upcoming = days.find((d) => d.status === 'upcoming')
  if (upcoming) return upcoming.dayOfWeek
  const first = days.find((d) => d.status !== 'rest')
  return first?.dayOfWeek ?? 1
}

type Props = {
  initialData: TrainingWeekData
  clientPlanId: string
  startDate: string
  clientId: string
}

export default function TrainingWeek({ initialData, clientPlanId, startDate, clientId }: Props) {
  const [weekData, setWeekData] = useState(initialData)
  const [selectedDay, setSelectedDay] = useState(() => getDefaultDay(initialData.days))
  const [isPending, startTransition] = useTransition()

  const currentDay = weekData.days.find((d) => d.dayOfWeek === selectedDay) ?? weekData.days[0]

  function navigateWeek(delta: number) {
    const newWeek = weekData.weekNumber + delta
    if (newWeek < 1 || newWeek > weekData.totalWeeks) return
    startTransition(async () => {
      const data = await getWeekTrainingData(
        clientPlanId,
        newWeek,
        startDate,
        weekData.totalWeeks,
        clientId
      )
      setWeekData(data)
      setSelectedDay(getDefaultDay(data.days))
    })
  }

  const canGoPrev = weekData.weekNumber > 1
  const canGoNext = weekData.weekNumber < weekData.totalWeeks

  return (
    <div
      style={{
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1F2227',
        }}
      >
        <button
          type="button"
          onClick={() => navigateWeek(-1)}
          disabled={!canGoPrev || isPending}
          style={{
            background: 'none',
            border: 'none',
            cursor: canGoPrev && !isPending ? 'pointer' : 'default',
            padding: 4,
            color: canGoPrev && !isPending ? '#6B7280' : '#2A2D34',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isPending ? '#4B5563' : '#F0F0F0',
              transition: 'color 0.15s',
            }}
          >
            Semana {weekData.weekNumber}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>de {weekData.totalWeeks} semanas</p>
        </div>

        <button
          type="button"
          onClick={() => navigateWeek(1)}
          disabled={!canGoNext || isPending}
          style={{
            background: 'none',
            border: 'none',
            cursor: canGoNext && !isPending ? 'pointer' : 'default',
            padding: 4,
            color: canGoNext && !isPending ? '#6B7280' : '#2A2D34',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 12px 4px',
          opacity: isPending ? 0.4 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {weekData.days.map((day) => {
          const isTraining = day.status !== 'rest'
          const isSelected = day.dayOfWeek === selectedDay
          const style = PILL_STYLES[day.status]

          return (
            <div
              key={day.dayOfWeek}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {isTraining ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(day.dayOfWeek)}
                  style={{
                    width: '100%',
                    height: 32,
                    borderRadius: 9999,
                    backgroundColor: style.bg,
                    border: `1.5px solid ${style.border}`,
                    color: style.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: isSelected ? '0 0 0 2px #B5F23D' : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  {DAY_LABELS[day.dayOfWeek - 1]}
                </button>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#2A2D34', fontWeight: 500 }}>
                    {DAY_LABELS[day.dayOfWeek - 1]}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '8px 16px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${weekData.weekNumber}-${selectedDay}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <DayDetail day={currentDay} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function DayDetail({ day }: { day: DayTrainingData }) {
  if (day.status === 'rest') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          gap: 8,
          color: '#2A2D34',
        }}
      >
        <Moon size={22} />
        <p style={{ fontSize: 13, color: '#4B5563' }}>Dia de descanso</p>
      </div>
    )
  }

  if (day.status === 'past_missed') {
    return (
      <div
        style={{
          backgroundColor: 'rgba(242,82,82,0.06)',
          border: '1px solid rgba(242,82,82,0.2)',
          borderRadius: 10,
          padding: '12px 14px',
          marginTop: 8,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: '#F25252' }}>No registrado</p>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          El cliente no registro esta sesion.
        </p>
      </div>
    )
  }

  if (day.exercises.length === 0) {
    return <p style={{ fontSize: 13, color: '#4B5563', padding: '16px 0' }}>Sin ejercicios planificados para este dia.</p>
  }

  if (day.status === 'upcoming' || day.status === 'today') {
    return (
      <div style={{ marginTop: 8 }}>
        <p style={SECTION_LABEL}>{day.status === 'today' ? 'Entrenamiento de hoy' : 'Planificado'}</p>
        {day.exercises.map((ex, i) => (
          <div
            key={ex.clientPlanDayExerciseId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderTop: i > 0 ? '1px solid #1A1D22' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: '#F0F0F0' }}>{ex.name}</span>
            <span
              style={{
                fontSize: 12,
                color: '#6B7280',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              {ex.plannedSets} ×{' '}
              {ex.plannedReps != null
                ? `${ex.plannedReps} reps`
                : ex.plannedDurationSeconds != null
                  ? `${ex.plannedDurationSeconds}s`
                  : '—'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const completedSets = day.exercises.reduce(
    (acc, ex) => acc + ex.sessionSets.filter((s) => s.completed).length,
    0
  )
  const totalPlannedSets = day.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0)

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: day.status === 'completed' ? '#B5F23D' : '#F2994A',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {day.status === 'completed' ? 'Completado' : 'En progreso'}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          {completedSets}/{totalPlannedSets} series
        </span>
      </div>

      {day.exercises.map((ex, exIndex) => (
        <motion.div
          key={ex.clientPlanDayExerciseId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: exIndex * 0.05 }}
          style={{
            paddingTop: exIndex > 0 ? 14 : 0,
            marginTop: exIndex > 0 ? 14 : 0,
            borderTop: exIndex > 0 ? '1px solid #1A1D22' : 'none',
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#F0F0F0',
              marginBottom: 8,
            }}
          >
            {ex.name}
          </p>

          {ex.sessionSets.length > 0 ? (
            ex.sessionSets.map((set) => {
              const weightPart = set.weightKg != null ? `${set.weightKg} kg` : ''
              const repPart =
                set.durationSeconds != null
                  ? `${set.durationSeconds}s`
                  : ex.plannedReps != null
                    ? `${ex.plannedReps} reps`
                    : ''
              const separator = weightPart && repPart ? ' × ' : ''

              return (
                <div
                  key={set.setNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                      minWidth: 60,
                      flexShrink: 0,
                    }}
                  >
                    Serie {set.setNumber}
                  </span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', flex: 1 }}>
                    {weightPart}
                    {separator}
                    {repPart}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: set.completed ? '#B5F23D' : '#F25252',
                    }}
                  >
                    {set.completed ? '✓' : '✗'}
                  </span>
                </div>
              )
            })
          ) : (
            <p style={{ fontSize: 12, color: '#4B5563', fontStyle: 'italic' }}>Sin datos registrados</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}
