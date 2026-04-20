'use client'

import { useMemo, useState } from 'react'

type OptionId = 'a' | 'b' | 'c'

const OPTIONS: Array<{ id: OptionId; label: string; title: string; subtitle: string }> = [
  {
    id: 'a',
    label: 'Opcion A',
    title: 'Progreso compacto por secciones',
    subtitle: 'Acordeones claros: peso, ejercicios y carga semanal',
  },
  {
    id: 'b',
    label: 'Opcion B',
    title: 'Lista de ejercicios con drilldown',
    subtitle: 'Buscador + filas compactas + detalle inline por ejercicio',
  },
  {
    id: 'c',
    label: 'Opcion C',
    title: 'Tiles + detalle en panel',
    subtitle: 'Pantalla corta con tarjetas y foco en interacciones',
  },
]

const rootStyle: React.CSSProperties = {
  minHeight: '100dvh',
  backgroundColor: '#0A0A0A',
  color: '#F0F0F0',
  padding: '20px 16px 120px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid #1F2227',
  backgroundColor: '#111317',
  padding: 12,
}

function OptionA() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Peso actual', '78.4 kg'],
          ['Cambio 4 sem', '-1.2 kg'],
          ['Check-ins', '6/8'],
          ['Ejercicios en alza', '12'],
        ].map(([label, value]) => (
          <div key={label} style={{ borderRadius: 10, border: '1px solid #252A31', padding: '8px 10px' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#B5F23D' }}>Peso corporal semanal</p>
        <p style={{ margin: '2px 0 10px', fontSize: 12, color: '#6B7280' }}>Ultimas 8 semanas</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 88 }}>
          {[42, 46, 52, 49, 58, 61, 66, 72].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '90%',
                  height: h,
                  borderRadius: 9999,
                  background: i === 7 ? '#B5F23D' : 'rgba(181,242,61,0.35)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <AccordionRow title="Progreso de ejercicios (todos)" hint="44 ejercicios con registros" />
        <AccordionRow title="Carga semanal" hint="Volumen, intensidad y VxI" />
      </div>
    </div>
  )
}

function OptionB() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniChart title="Peso corporal" color="#B5F23D" />
        <MiniChart title="Volumen semanal" color="#56C5FA" />
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Ejercicios del cliente</p>
          <span style={{ fontSize: 11, color: '#6B7280' }}>44 items</span>
        </div>
        <div
          style={{
            border: '1px solid #252A31',
            borderRadius: 10,
            padding: '8px 10px',
            marginBottom: 8,
            fontSize: 12,
            color: '#6B7280',
          }}
        >
          Buscar ejercicio...
        </div>
        {[
          ['Sentadilla', 'Top set 120 kg', 'subiendo'],
          ['Press banca', 'Top set 85 kg', 'estable'],
          ['Peso muerto', 'Top set 150 kg', 'subiendo'],
        ].map(([name, value, trend], idx) => (
          <div key={name} style={{ borderTop: idx ? '1px solid #1F2227' : 'none', padding: '9px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{name}</p>
              <p style={{ margin: 0, fontSize: 12, color: trend === 'subiendo' ? '#22C55E' : '#F2B01E' }}>
                {trend}
              </p>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OptionC() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ borderRadius: 10, border: '1px solid #252A31', padding: '8px 10px' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Peso actual</p>
          <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700 }}>78.4 kg</p>
        </div>
        <div style={{ borderRadius: 10, border: '1px solid #252A31', padding: '8px 10px' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Tendencia</p>
          <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#22C55E' }}>Positiva</p>
        </div>
      </div>

      <Tile title="Peso corporal" description="Check-ins semanales y evolucion de kg." cta="Abrir detalle" />
      <Tile title="Progreso por ejercicio" description="Todos los ejercicios con historial de cargas." cta="Abrir detalle" />
      <Tile title="Carga semanal" description="Volumen, intensidad y volumen x intensidad." cta="Abrir detalle" />

      <div style={{ ...cardStyle, borderColor: '#56C5FA66', backgroundColor: '#101722' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#56C5FA' }}>Vista de detalle (mockup panel)</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600 }}>Sentadilla - evolucion semanal</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[52, 56, 60, 64, 66, 70].map((h, i) => (
            <div key={i} style={{ flex: 1, height: 70, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: '#56C5FA66' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tile({ title, description, cta }: { title: string; description: string; cta: string }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#9CA3AF' }}>{description}</p>
      <button
        type="button"
        style={{
          border: 'none',
          borderRadius: 9999,
          padding: '7px 12px',
          backgroundColor: '#B5F23D',
          color: '#0A0A0A',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {cta}
      </button>
    </div>
  )
}

function MiniChart({ title, color }: { title: string; color: string }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid #252A31', padding: '8px 10px' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{title}</p>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'flex-end', height: 62 }}>
        {[24, 28, 34, 31, 36, 40].map((h, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '85%', borderRadius: 6, height: h, backgroundColor: `${color}AA` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function AccordionRow({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{hint}</p>
      </div>
      <span style={{ color: '#B5F23D', fontSize: 16, fontWeight: 700 }}>+</span>
    </div>
  )
}

export default function ClientProfileMockupsPage() {
  const [activeOption, setActiveOption] = useState<OptionId>('a')

  const option = useMemo(() => OPTIONS.find((item) => item.id === activeOption) ?? OPTIONS[0], [activeOption])

  return (
    <main style={rootStyle}>
      <div style={{ padding: '2px 2px 8px' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Mockups tab progreso
        </p>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, lineHeight: 1.2 }}>{option.title}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>{option.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {OPTIONS.map((item) => {
          const isActive = item.id === activeOption
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveOption(item.id)}
              style={{
                border: 'none',
                borderRadius: 9999,
                padding: '8px 12px',
                backgroundColor: isActive ? '#B5F23D' : '#1B1E24',
                color: isActive ? '#0A0A0A' : '#F0F0F0',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {activeOption === 'a' ? <OptionA /> : activeOption === 'b' ? <OptionB /> : <OptionC />}
    </main>
  )
}
