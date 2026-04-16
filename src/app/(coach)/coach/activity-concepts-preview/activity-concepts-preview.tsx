'use client'

import type { CSSProperties } from 'react'

/**
 * Mockups exploratorios para el tab Actividad — abrir /coach/activity-concepts-preview
 */

const BG = '#0A0A0A'
const CARD = '#111317'
const BORDER = '#1F2227'
const TEXT = '#F0F0F0'
const MUTED = '#6B7280'
const ACCENT = '#B5F23D'
const WARN = '#F2994A'
const ERR = '#F25252'

const sectionTitle: CSSProperties = {
  margin: '0 0 6px',
  fontSize: 18,
  fontWeight: 700,
  color: TEXT,
  letterSpacing: '-0.02em',
}

const sectionHint: CSSProperties = {
  margin: '0 0 16px',
  fontSize: 12,
  color: MUTED,
  lineHeight: 1.45,
}

/** Aire bajo el último bloque (bottom nav del layout + home indicator). */
const WRAP_PADDING_BOTTOM_PX = 120

const wrap: CSSProperties = {
  maxWidth: 400,
  margin: '0 auto',
  padding: `20px 20px ${WRAP_PADDING_BOTTOM_PX}px`,
}

export default function ActivityConceptsPreview() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        backgroundColor: BG,
        color: TEXT,
      }}
    >
      <div style={wrap}>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          Vista previa de <strong style={{ color: TEXT }}>ideas de UX</strong> para el tab Actividad. Datos de
          ejemplo; ninguna es la pantalla definitiva.
        </p>

        {/* 1 — Radar del día */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>1. Radar del día</h2>
          <p style={sectionHint}>
            Métricas arriba; tap llevaría a lista filtrada. Resumen en segundos.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {[
              { label: 'Sesiones hoy', value: '5', sub: '3 clientes', tone: ACCENT },
              { label: 'Sin registro', value: '2', sub: 'esperaban entreno', tone: WARN },
              { label: 'En riesgo', value: '1', sub: 'ver lista', tone: ERR },
              { label: 'Sin plan', value: '1', sub: 'asignar', tone: MUTED },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                style={{
                  textAlign: 'left',
                  padding: '14px 12px',
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  backgroundColor: CARD,
                  cursor: 'default',
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 600 }}>{m.label}</p>
                <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800, color: m.tone }}>{m.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{m.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 2 — Timeline por días */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>2. Timeline por días</h2>
          <p style={sectionHint}>Eventos agrupados: Hoy / Ayer / Esta semana.</p>
          {[
            {
              day: 'Hoy',
              items: ['María G. · completó Push day', 'Leo P. · plan asignado'],
            },
            {
              day: 'Ayer',
              items: ['Ana R. · sesión registrada', 'María G. · sin registro (recordatorio)'],
            },
          ].map((group) => (
            <div key={group.day} style={{ marginBottom: 14 }}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {group.day}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((t) => (
                  <div
                    key={t}
                    style={{
                      padding: '11px 12px',
                      borderRadius: 12,
                      border: `1px solid ${BORDER}`,
                      backgroundColor: CARD,
                      fontSize: 13,
                      color: TEXT,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 3 — Heatmap semanal */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>3. Mapa de calor (semana)</h2>
          <p style={sectionHint}>Filas = clientes ejemplo; columnas = Lun–Dom. Intensidad = sesiones.</p>
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              backgroundColor: CARD,
              padding: 12,
              overflowX: 'auto',
            }}
          >
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, paddingLeft: 72 }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <span
                  key={d}
                  style={{
                    width: 22,
                    textAlign: 'center',
                    fontSize: 10,
                    color: MUTED,
                    fontWeight: 600,
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            {[
              ['María',1, 0, 1, 1, 0, 0, 1],
              ['Leo', 0, 1, 1, 0, 1, 0, 0],
              ['Ana', 1, 1, 0, 0, 0, 0, 0],
            ].map((row) => (
              <div key={row[0] as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    width: 64,
                    fontSize: 11,
                    color: MUTED,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row[0] as string}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(row.slice(1) as number[]).map((v, i) => (
                    <div
                      key={i}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        backgroundColor: v ? ACCENT : '#1A1D22',
                        opacity: v ? 0.35 + v * 0.25 : 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 — Cola de acción */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>4. Cola de “siguiente acción”</h2>
          <p style={sectionHint}>Pocas tarjetas grandes; prioridad manual o por reglas.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { title: 'Revisar a Leo', body: 'Sin registro hace 6 días · plan activo', accent: ERR },
              { title: 'Asignar plan', body: 'Ana quedó sin plan activo', accent: WARN },
              { title: 'Celebrar', body: 'María cumplió 4/4 esta semana', accent: ACCENT },
            ].map((a) => (
              <div
                key={a.title}
                style={{
                  padding: '16px 14px',
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${a.accent}`,
                  backgroundColor: CARD,
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{a.title}</p>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{a.body}</p>
                <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 600, color: ACCENT }}>Abrir perfil →</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5 — Historias / carrusel */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>5. Carrusel tipo “historias”</h2>
          <p style={sectionHint}>Swipe horizontal: un cliente por tarjeta, hito + sugerencia.</p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 8,
              WebkitOverflowScrolling: 'touch',
              marginLeft: -4,
              paddingLeft: 4,
            }}
          >
            {[
              { name: 'María G.', line: 'Última sesión: ayer', hint: 'Enviar ánimo' },
              { name: 'Leo P.', line: 'Racha: 2 semanas', hint: 'Revisar volumen' },
              { name: 'Ana R.', line: 'Sin plan', hint: 'Asignar microciclo' },
            ].map((s) => (
              <div
                key={s.name}
                style={{
                  flex: '0 0 72%',
                  maxWidth: 260,
                  padding: '18px 14px',
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: `linear-gradient(165deg, #14181E 0%, #101216 100%)`,
                }}
              >
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>{s.name}</p>
                <p style={{ margin: '10px 0 0', fontSize: 13, color: MUTED }}>{s.line}</p>
                <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: ACCENT }}>{s.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6 — Novedades */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={sectionTitle}>6. Novedades + filtros</h2>
          <p style={sectionHint}>Cabecera con contador; lista compacta filtrable.</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              padding: '12px 14px',
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              backgroundColor: CARD,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Desde tu última visita</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0A0A0A',
                backgroundColor: ACCENT,
                padding: '4px 10px',
                borderRadius: 9999,
              }}
            >
              12 nuevos
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {['Todo', 'Sesiones', 'Planes'].map((f, i) => (
              <span
                key={f}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 9999,
                  border: `1px solid ${BORDER}`,
                  backgroundColor: i === 0 ? 'rgba(181,242,61,0.12)' : CARD,
                  color: i === 0 ? ACCENT : MUTED,
                }}
              >
                {f}
              </span>
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: '11px 12px',
                marginBottom: 8,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                backgroundColor: CARD,
                fontSize: 13,
                color: TEXT,
              }}
            >
              <span style={{ fontWeight: 600 }}>Evento {i}</span>
              <span style={{ color: MUTED }}> · hace {i}h · ejemplo</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
