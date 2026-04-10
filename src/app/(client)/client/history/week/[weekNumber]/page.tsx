import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { getWeekDetailData } from './queries'
import WeekDetailClient from './week-detail-client'

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const num = parseInt(weekNumber, 10)
  if (Number.isNaN(num) || num < 1) notFound()

  const data = await getWeekDetailData(user.id, num)
  if (!data) notFound()

  return (
    <div>
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/client/history"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ←
        </Link>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#F0F0F0' }}>
          Semana {data.weekNumber}
        </p>
      </div>

      <WeekDetailClient data={data} />
    </div>
  )
}
