// Types for the client-side training features

export type TodayExercise = {
  clientPlanDayExerciseId: string
  name: string
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
}

export type TodayDayData = {
  clientPlanDayId: string
  dayOfWeek: number
  exercises: TodayExercise[]
  existingSessionId: string | null
  sessionStatus: 'in_progress' | 'completed' | null
}

export type ClientActivePlan = {
  id: string
  name: string
  weeks: number
  currentWeek: number
  startDate: string
  endDate: string
  progressPct: number
}

export type WeekStripDayStatus =
  | 'completed'
  | 'in_progress'
  | 'today'
  | 'upcoming'
  | 'past_missed'
  | 'rest'

export type WeekStripDay = {
  dayOfWeek: number
  status: WeekStripDayStatus
  clientPlanDayId?: string
  dateISO?: string
}

export type ClientDashboardData = {
  fullName: string
  activePlan: ClientActivePlan | null
  today: TodayDayData | null // null = rest day or no active plan
  weekStrip: WeekStripDay[] | null
  inProgressSession: { sessionId: string } | null
}

// ── Live training types ────────────────────────────────────────────────────

export type SetLog = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type LiveExercise = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  videoUrl: string | null
  loggedSets: SetLog[]
}

export type LiveSessionData = {
  sessionId: string
  clientPlanDayId: string
  status: 'in_progress' | 'completed'
  exercises: LiveExercise[]
}

// ── History types ──────────────────────────────────────────────────────────

export type SessionHistoryItem = {
  id: string
  date: string
  status: 'in_progress' | 'completed'
  completedAt: string | null
  planName: string
  dayOfWeek: number
}

// ── Plan view types ────────────────────────────────────────────────────────

export type PlanDayWithStatus = {
  clientPlanDayId: string
  weekNumber: number
  dayOfWeek: number
  dateISO: string
  status: 'completed' | 'in_progress' | 'today' | 'upcoming' | 'past_missed'
  existingSessionId: string | null
}

export type PlanWeekData = {
  weekNumber: number
  days: PlanDayWithStatus[]
}

export type ClientPlanViewData = {
  planId: string
  planName: string
  startDate: string
  endDate: string
  weeks: number
  currentWeek: number
  progressPct: number
  completedSessions: number
  totalTrainingDays: number
  weeksByNumber: PlanWeekData[]
}

// ── Day detail types ───────────────────────────────────────────────────────

export type DayExerciseDetail = {
  clientPlanDayExerciseId: string
  exerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  order: number
  plannedSets: number
  plannedReps: number | null
  plannedDurationSeconds: number | null
  restSeconds: number | null
  videoUrl: string | null
}

export type DayDetailData = {
  clientPlanDayId: string
  weekNumber: number
  dayOfWeek: number
  dateISO: string
  exercises: DayExerciseDetail[]
  sessionId: string | null
  sessionStatus: 'in_progress' | 'completed' | null
}

// ── Weekly history types ───────────────────────────────────────────────────

export type WeekHistorySummary = {
  weekNumber: number
  dateRangeStart: string
  dateRangeEnd: string
  completedDays: number
  totalTrainingDays: number
  compliancePct: number
}

export type WeekDetailSet = {
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
  completed: boolean
}

export type WeekDetailExercise = {
  clientPlanDayExerciseId: string
  name: string
  muscleGroup: string
  type: 'strength' | 'cardio'
  plannedReps: number | null
  plannedDurationSeconds: number | null
  sets: WeekDetailSet[]
}

export type WeekDetailSession = {
  sessionId: string
  clientPlanDayId: string
  dayOfWeek: number
  dateISO: string
  completedAt: string | null
  exercises: WeekDetailExercise[]
}

export type WeekDetailData = {
  weekNumber: number
  dateRangeStart: string
  dateRangeEnd: string
  sessions: WeekDetailSession[]
}

// ── Notification prefs ─────────────────────────────────────────────────────

export type NotificationPrefs = {
  reminders: boolean
  coachMsgs: boolean
}
