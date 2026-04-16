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
  fontWeight: 700,
  color: '#B5F23D',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 14,
}

/** Misma jerarquía que títulos de tabs (Clientes / Biblioteca). */
const screenTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: '#F0F0F0',
  lineHeight: 1.2,
  textAlign: 'center',
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
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 20px 8px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div aria-hidden />
        <p style={screenTitle}>Ajustes</p>
        <div aria-hidden />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          padding: '0 20px 120px',
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 24,
            marginTop: 0,
            textAlign: 'center',
          }}
        >
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
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(242, 82, 82, 0.35)',
                  backgroundColor: 'rgba(242, 82, 82, 0.06)',
                  padding: 4,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="submit"
                  style={{
                    width: 'fit-content',
                    minWidth: 0,
                    padding: '0 20px',
                    height: 48,
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#F25252',
                    backgroundColor: 'rgba(242, 82, 82, 0.12)',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
