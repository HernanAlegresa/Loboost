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

export type ClientDashboardData = {
  fullName: string
  activePlan: ClientActivePlan | null
  today: TodayDayData | null // null = rest day or no active plan
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
