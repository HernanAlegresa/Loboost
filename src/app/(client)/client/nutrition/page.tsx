import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function NutritionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div
      style={{
        padding: '20px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Nutrición</p>

      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 36 }}>🥗</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0' }}>
          Sin recomendaciones todavía
        </p>
        <p style={{ fontSize: 13, color: '#4B5563', maxWidth: 260 }}>
          Tu coach aún no cargó recomendaciones de nutrición. Cuando lo haga, las vas a ver acá.
        </p>
      </div>
    </div>
  )
}
