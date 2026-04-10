import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ClientAvatar from '@/components/ui/client-avatar'
import NotificationToggles from './notification-toggles'
import { signOut } from '@/features/auth/actions/sign-out'
import type { NotificationPrefs } from '@/features/training/types'

async function getSettingsData(userId: string) {
  const supabase = await createClient()

  const [profileResult, clientProfileResult, prefsResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    supabase.from('client_profiles').select('goal').eq('id', userId).maybeSingle(),
    supabase
      .from('notification_preferences')
      .select('reminders, coach_msgs')
      .eq('client_id', userId)
      .maybeSingle(),
  ])

  return {
    fullName: profileResult.data?.full_name ?? '',
    goal: clientProfileResult.data?.goal ?? null,
    prefs: {
      reminders: prefsResult.data?.reminders ?? true,
      coachMsgs: prefsResult.data?.coach_msgs ?? true,
    } as NotificationPrefs,
  }
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getSettingsData(user.id)

  const SECTION_LABEL: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  return (
    <div
      style={{
        padding: '24px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0' }}>Ajustes</p>

      <div>
        <p style={SECTION_LABEL}>Perfil</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <ClientAvatar name={data.fullName || 'Cliente'} size={52} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0' }}>
                {data.fullName || 'Cliente'}
              </p>
              {data.goal && (
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>🎯 {data.goal}</p>
              )}
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#0F1014',
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 11, color: '#4B5563', marginBottom: 2 }}>Email</p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>{user.email ?? '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <p style={SECTION_LABEL}>Notificaciones</p>
        <div
          style={{
            backgroundColor: '#111317',
            border: '1px solid #1F2227',
            borderRadius: 14,
            padding: '0 16px',
          }}
        >
          <NotificationToggles initial={data.prefs} />
        </div>
      </div>

      <div>
        <p style={SECTION_LABEL}>Cuenta</p>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 14,
              backgroundColor: 'rgba(242,82,82,0.1)',
              border: '1px solid rgba(242,82,82,0.2)',
              borderRadius: 14,
              color: '#F25252',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
