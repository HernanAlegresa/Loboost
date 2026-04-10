import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/features/auth/actions/sign-out'
import CoachSettingsForm from './coach-settings-form'

const cardStyle: CSSProperties = {
  backgroundColor: '#111317',
  border: '1px solid #1F2227',
  borderRadius: 14,
  padding: '18px 16px',
}

const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 14,
}

export default async function CoachSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'coach') {
    redirect('/login')
  }

  const email = user.email ?? ''
  const fullName = profile.full_name?.trim() ?? ''

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 20px 120px' }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>Ajustes</p>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 24 }}>
        Tu cuenta y preferencias básicas
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={cardStyle}>
          <p style={sectionLabel}>Perfil</p>
          <CoachSettingsForm initialFullName={fullName} />
        </section>

        <section style={cardStyle}>
          <p style={sectionLabel}>Correo</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', wordBreak: 'break-all' }}>
            {email || '—'}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 10, lineHeight: 1.45 }}>
            El correo lo gestiona el inicio de sesión. Para cambiarlo, contactá soporte o usá el flujo
            de recuperación de tu proveedor cuando esté disponible en la app.
          </p>
        </section>

        <section style={cardStyle}>
          <p style={sectionLabel}>Sesión</p>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                border: '1px solid #2A2D34',
                fontSize: 15,
                fontWeight: 600,
                color: '#F0F0F0',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
