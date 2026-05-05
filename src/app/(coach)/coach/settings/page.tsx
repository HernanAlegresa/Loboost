import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/features/auth/actions/sign-out'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import CoachSettingsForm from './coach-settings-form'
import ChangePasswordForm from '@/components/ui/change-password-form'

/** Mismo respiro que `LIST_BOTTOM_GAP_PX` / `LIBRARY_LIST_BOTTOM_GAP_PX` en Clientes y Biblioteca. */
const SETTINGS_SCROLL_BOTTOM_GAP_PX = 28

/** Sección sin caja (solo título + contenido). */
const plainSectionStyle: CSSProperties = {
  padding: 0,
  margin: 0,
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
  fontSize: 16,
  fontWeight: 600,
  color: '#F0F0F0',
  lineHeight: 1.2,
  textAlign: 'center',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
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
          padding: '6px 20px 0',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          minHeight: 42,
          flexShrink: 0,
        }}
      >
        <div aria-hidden />
        <p style={screenTitle}>Ajustes</p>
        <div aria-hidden />
      </div>
      <div
        style={{
          flexShrink: 0,
          padding: '3px 20px 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            height: 2,
            width: 92,
            backgroundColor: '#B5F23D',
            borderRadius: 9999,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          paddingTop: 16,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: `calc(${SAFE_BOTTOM_NAV_HEIGHT} + ${SETTINGS_SCROLL_BOTTOM_GAP_PX}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={plainSectionStyle}>
            <p style={sectionLabel}>Perfil</p>
            <CoachSettingsForm initialFullName={fullName} />
          </section>

          <section style={plainSectionStyle}>
            <p style={sectionLabel}>Correo</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', wordBreak: 'break-all' }}>
              {email || '—'}
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 10, lineHeight: 1.45 }}>
              El correo lo gestiona el inicio de sesión. Para cambiarlo, contactá soporte o usá el flujo
              de recuperación de tu proveedor cuando esté disponible en la app.
            </p>
          </section>

          <section style={plainSectionStyle}>
            <p style={sectionLabel}>Seguridad</p>
            <ChangePasswordForm />
          </section>

          <section style={plainSectionStyle}>
            <p style={sectionLabel}>Sesión</p>
            <form action={signOut}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
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
