export type CreateClientState =
  | { success: true; clientId: string; clientName: string }
  | { success: false; error: string }
  | null

// ── Training week types ────────────────────────────────────────────────────

export type SessionSetData = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type ExerciseWithSets = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  order: number
  plannedSets: number
  plannedRepsMin: number | null
  plannedRepsMax: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  sessionSets: SessionSetData[]
}

export type DayStatus =
  | 'completed'
  | 'in_progress'
  | 'today'
  | 'upcoming'
  | 'past_missed'
  | 'rest'

export type DayTrainingData = {
  dayOfWeek: number           // 1=Mon … 7=Sun
  date: string                // ISO 'YYYY-MM-DD'
  status: DayStatus
  clientPlanDayId: string | null
  sessionId: string | null
  exercises: ExerciseWithSets[]
}

export type TrainingWeekData = {
  weekNumber: number
  totalWeeks: number
  days: DayTrainingData[]     // always 7 items
}

// ── Client profile types ───────────────────────────────────────────────────

export type ActivePlanSummary = {
  id: string
  name: string
  weeks: number
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'paused'
  currentWeek: number
}

export type ClientProfileData = {
  id: string
  fullName: string
  goal: string | null
  statusColor: 'active' | 'warning' | 'critical'
  weeklyCompliance: number
  daysSinceLastSession: number | null
  totalSessions: number
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  injuries: string | null
  activePlan: ActivePlanSummary | null
  currentWeekData: TrainingWeekData | null
  coachNote: string
  progressSeries: Array<{
    label: string
    completed: number
  }>
}
