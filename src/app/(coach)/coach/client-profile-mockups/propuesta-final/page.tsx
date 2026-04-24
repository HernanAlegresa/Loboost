'use client'

const rootStyle: React.CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  backgroundColor: '#0A0A0A',
  color: '#F0F0F0',
  padding: '20px 16px 120px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid #1F2227',
  backgroundColor: '#111317',
  padding: 12,
}

function FinalTile({
  title,
  subtitle,
  badge,
  badgeColor,
  badgeBg,
  badgeBorder,
}: {
  title: string
  subtitle: string
  badge: string
  badgeColor: string
  badgeBg: string
  badgeBorder: string
}) {
  return (
    <div
      style={{
        border: '1px solid #1F2227',
        borderRadius: 12,
        padding: '11px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{subtitle}</p>
      </div>
      <span
        style={{
          borderRadius: 9999,
          border: `1px solid ${badgeBorder}`,
          backgroundColor: badgeBg,
          color: badgeColor,
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 8px',
          whiteSpace: 'nowrap',
        }}
      >
        {badge}
      </span>
      <span style={{ color: '#6B7280', fontSize: 18, fontWeight: 700 }} aria-hidden>
        ›
      </span>
    </div>
  )
}

export default function ClientProfileProgressFinalMockupPage() {
  return (
    <main style={rootStyle}>
      <div style={{ paddingBottom: 4 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: '#6B7280',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Mockup final - tab progreso
        </p>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, lineHeight: 1.2 }}>
          Resumen clave + seguimiento accionable
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>
          Vista resumida para decision rapida del coach con accesos a profundidad por modulo.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 14 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 600,
            color: '#6B7280',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Estado del progreso
        </p>
        <div
          style={{
            marginTop: 8,
            borderRadius: 12,
            border: '1px solid #3A2E18',
            backgroundColor: '#17140F',
            padding: '10px 11px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                borderRadius: 9999,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#F2B01E',
                backgroundColor: 'rgba(242,176,30,0.14)',
                border: '1px solid rgba(242,176,30,0.35)',
              }}
            >
              ATENCION
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Semana 6 de 8</span>
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>
            Seguimiento parcialmente al dia
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB' }}>
            - Faltan 2 check-ins para completar la semana actual
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB' }}>
            - Carga semanal estable vs semana anterior
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 600,
            color: '#6B7280',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Resumen rapido
        </p>
        <div style={{ marginTop: 8, borderRadius: 12, border: '1px solid #252A31', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {[
              ['Peso inicial', '84 kg', '#F0F0F0'],
              ['Peso actual', '81.7 kg', '#B5F23D'],
              ['Check-ins', '4/6', '#F0F0F0'],
            ].map(([label, value, color], idx) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: '14px 8px',
                  textAlign: 'center',
                  borderLeft: idx ? '1px solid #1F2227' : 'none',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: '#6B7280',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </p>
                <p style={{ margin: '7px 0 0', fontSize: 21, fontWeight: 700, color }}>{value}</p>
                {label === 'Peso actual' ? (
                  <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 700, color: '#B5F23D' }}>-2.3 kg</p>
                ) : null}
              </div>
            ))}
          </div>
          <p
            style={{
              margin: 0,
              borderTop: '1px solid #1F2227',
              fontSize: 12,
              color: '#9CA3AF',
              textAlign: 'center',
              padding: '9px 10px',
            }}
          >
            18 sesiones completadas en total
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Actividad reciente
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>19 sesiones</p>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>Ultimas 6 semanas</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'flex-end', height: 76 }}>
          {[28, 45, 34, 50, 38, 56].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '90%',
                  height: h,
                  borderRadius: 8,
                  backgroundColor: i === 5 ? '#B5F23D' : '#2A2D34',
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((label) => (
            <p key={label} style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: 10, color: '#6B7280' }}>
              {label}
            </p>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9CA3AF' }}>2 semanas con registro incompleto</p>
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 600,
            color: '#6B7280',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Seguimiento detallado
        </p>
        <FinalTile
          title="Check-ins semanales"
          subtitle="Peso y adherencia por semana"
          badge="2 pendientes"
          badgeColor="#F2B01E"
          badgeBg="rgba(242,176,30,0.14)"
          badgeBorder="rgba(242,176,30,0.3)"
        />
        <FinalTile
          title="Progreso de ejercicios"
          subtitle="Evolucion de carga por ejercicio"
          badge="Estable"
          badgeColor="#9CA3AF"
          badgeBg="rgba(156,163,175,0.14)"
          badgeBorder="rgba(156,163,175,0.25)"
        />
        <FinalTile
          title="Carga semanal"
          subtitle="Volumen, intensidad y tonelaje"
          badge="Ver tendencia"
          badgeColor="#B5F23D"
          badgeBg="rgba(181,242,61,0.14)"
          badgeBorder="rgba(181,242,61,0.35)"
        />
      </div>

      <p style={{ margin: 0, fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.4 }}>
        Vista resumida para decision rapida. Abre cada modulo para analisis completo.
      </p>
    </main>
  )
}
