import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import {
  getClientProgressData,
  getExerciseProgressSeries,
  getBodyWeightSeries,
  getClientProgressStats,
} from './queries'
import ProgressView from './progress-view'

export default async function ClientProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [data, exerciseSeries, bodyWeight, stats] = await Promise.all([
    getClientProgressData(user.id),
    getExerciseProgressSeries(user.id),
    getBodyWeightSeries(user.id),
    getClientProgressStats(user.id),
  ])

  return (
    <ProgressView
      clientId={user.id}
      data={data}
      exerciseSeries={exerciseSeries}
      bodyWeight={bodyWeight}
      stats={stats}
    />
  )
}
