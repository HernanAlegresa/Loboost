import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import CoachSettingsForm from './coach-settings-form'
import ChangePasswordForm from '@/components/ui/change-password-form'
import SignOutHeaderButton from './sign-out-header-button'

const SETTINGS_SCROLL_BOTTOM_GAP_PX = 28

const screenTitleStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: '#F0F0F0',
  lineHeight: 1.2,
  textAlign: 'center' as const,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
}

const sectionLabelStyle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  color: '#B5F23D',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
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
        backgroundColor: '#0A0A0A',
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
        <p style={screenTitleStyle}>Ajustes</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SignOutHeaderButton />
        </div>
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
          paddingTop: 34,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: `calc(${SAFE_BOTTOM_NAV_HEIGHT} + ${SETTINGS_SCROLL_BOTTOM_GAP_PX}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>
          <section>
            <div>
              <CoachSettingsForm initialFullName={fullName} />
            </div>
          </section>

          <section>
            <p style={sectionLabelStyle}>Correo</p>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 15,
                fontWeight: 600,
                color: '#F0F0F0',
                wordBreak: 'break-all',
              }}
            >
              {email || '—'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.45 }}>
              Gestionado por tu inicio de sesión.
            </p>
          </section>

          <section>
            <p style={sectionLabelStyle}>Seguridad</p>
            <div style={{ marginTop: 10 }}>
              <ChangePasswordForm variant="embedded" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}