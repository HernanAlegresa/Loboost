'use client'

import { useMemo, useState } from 'react'

type VariantId = 'balanced' | 'analytics' | 'focus'
type MetricId = 'adherence' | 'volume' | 'intensity'

type WeekPoint = {
  week: number
  sessionsDone: number
  sessionsPlanned: number
  sets: number
  avgKg: number | null
  highlights: string[]
}

const WEEKS: WeekPoint[] = [
  { week: 1, sessionsDone: 3, sessionsPlanned: 3, sets: 62, avgKg: 46.8, highlights: ['Inicio de bloque', 'Carga base'] },
  { week: 2, sessionsDone: 3, sessionsPlanned: 3, sets: 68, avgKg: 48.9, highlights: ['Buena adherencia', 'Banca estable'] },
  { week: 3, sessionsDone: 2, sessionsPlanned: 3, sets: 54, avgKg: 45.6, highlights: ['Sesion omitida', 'Fatiga reportada'] },
  { week: 4, sessionsDone: 3, sessionsPlanned: 3, sets: 73, avgKg: 50.1, highlights: ['Recuperacion', 'Mejor tecnica'] },
  { week: 5, sessionsDone: 3, sessionsPlanned: 3, sets: 76, avgKg: 51.4, highlights: ['Semana estable', 'Mayor volumen'] },
  { week: 6, sessionsDone: 3, sessionsPlanned: 3, sets: 80, avgKg: 52.1, highlights: ['PR en sentadilla', 'Sin molestias'] },
  { week: 7, sessionsDone: 2, sessionsPlanned: 3, sets: 58, avgKg: 47.2, highlights: ['Viaje laboral', 'Menos carga'] },
  { week: 8, sessionsDone: 3, sessionsPlanned: 3, sets: 82, avgKg: 53.5, highlights: ['Vuelta completa', 'Carga en alza'] },
  { week: 9, sessionsDone: 3, sessionsPlanned: 3, sets: 85, avgKg: 54.1, highlights: ['Progreso sostenido', 'Mejor recuperacion'] },
  { week: 10, sessionsDone: 3, sessionsPlanned: 3, sets: 87, avgKg: 54.7, highlights: ['Dominio tecnico', 'Semana fuerte'] },
  { week: 11, sessionsDone: 3, sessionsPlanned: 3, sets: 89, avgKg: 55.2, highlights: ['Carga consistente', 'Sin dolor'] },
  { week: 12, sessionsDone: 2, sessionsPlanned: 3, sets: 63, avgKg: 49.6, highlights: ['Semana de descarga', 'Carga moderada'] },
  { week: 13, sessionsDone: 3, sessionsPlanned: 3, sets: 91, avgKg: 55.9, highlights: ['Rebote positivo', 'PR en banca'] },
  { week: 14, sessionsDone: 3, sessionsPlanned: 3, sets: 94, avgKg: 56.8, highlights: ['Semana actual', 'Pico de bloque'] },
]

const VARIANTS: Array<{ id: VariantId; label: string; title: string; subtitle: string }> = [
  {
    id: 'balanced',
    label: 'Final A',
    title: 'Vista balanceada para coach',
    subtitle: 'Resumen rapido, grafico principal y detalle explicativo por semana.',
  },
  {
    id: 'analytics',
    label: 'Final B',
    title: 'Vista analitica comparativa',
    subtitle: 'Enfocada en variacion semanal y semaforo de riesgo de carga.',
  },
  {
    id: 'focus',
    label: 'Final C',
    title: 'Vista enfoque de anomalias',
    subtitle: 'Detecta rapido semanas fuera del patron con timeline visual.',
  },
]

const METRICS: Array<{ id: MetricId; label: string; helper: string }> = [
  { id: 'adherence', label: 'Adherencia semanal', helper: 'Sesiones completadas sobre planificadas' },
  { id: 'volume', label: 'Volumen de series', helper: 'Cantidad total de series completadas por semana' },
  { id: 'intensity', label: 'Intensidad media (kg/serie)', helper: 'Promedio de kg por serie con carga registrada' },
]

function getMetricValue(week: WeekPoint, metric: MetricId): number {
  if (metric === 'adherence') return Math.round((week.sessionsDone / week.sessionsPlanned) * 100)
  if (metric === 'volume') return week.sets
  return week.avgKg ?? 0
}

function getMetricSummary(week: WeekPoint, metric: MetricId): string {
  if (metric === 'adherence') return `${week.sessionsDone}/${week.sessionsPlanned} sesiones`
  if (metric === 'volume') return `${week.sets} series`
  return week.avgKg === null ? 'Sin datos de carga' : `${week.avgKg.toFixed(1)} kg/serie`
}

function comparisonLabel(current: number, previous: number): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (previous <= 0) return { text: 'Sin base de comparacion', tone: 'flat' }
  const delta = ((current - previous) / previous) * 100
  if (Math.abs(delta) < 3) return { text: 'Se mantiene estable', tone: 'flat' }
  if (delta > 0) return { text: `Sube ${delta.toFixed(1)}% vs sem pasada`, tone: 'up' }
  return { text: `Baja ${Math.abs(delta).toFixed(1)}% vs sem pasada`, tone: 'down' }
}

function toneColor(tone: 'up' | 'down' | 'flat'): string {
  if (tone === 'up') return '#22C55E'
  if (tone === 'down') return '#F87171'
  return '#9CA3AF'
}

function HeroCard({ selected, metric, prev }: { selected: WeekPoint; metric: MetricId; prev: WeekPoint | null }) {
  const current = getMetricValue(selected, metric)
  const previous = prev ? getMetricValue(prev, metric) : 0
  const status = comparisonLabel(current, previous)

  return (
    <section style={heroCard}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(110% 80% at 80% -10%, rgba(181,242,61,0.22) 0%, rgba(181,242,61,0) 72%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <p style={eyebrow}>Carga semanal - Sofia Mendez</p>
        <h1 style={{ margin: '6px 0 0', fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em' }}>Semana {selected.week} del plan</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>{getMetricSummary(selected, metric)}</p>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: toneColor(status.tone), fontWeight: 700 }}>{status.text}</p>
      </div>
    </section>
  )
}

function KpiStrip({ selected }: { selected: WeekPoint }) {
  return (
    <section style={glassCard}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <KpiBlock title="Adherencia semanal" value={`${selected.sessionsDone}/${selected.sessionsPlanned}`} helper="Sesiones" />
        <KpiBlock title="Volumen de series" value={`${selected.sets}`} helper="Series completadas" />
        <KpiBlock
          title="Intensidad media (kg/serie)"
          value={selected.avgKg === null ? '--' : selected.avgKg.toFixed(1)}
          helper="Kg por serie"
        />
      </div>
    </section>
  )
}

function KpiBlock({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <article style={kpiBlock}>
      <p style={{ margin: 0, fontSize: 10, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9CA3AF' }}>{helper}</p>
    </article>
  )
}

function MetricTabs({ metric, onChange }: { metric: MetricId; onChange: (id: MetricId) => void }) {
  return (
    <section style={{ ...glassCard, padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {METRICS.map((item) => {
          const active = item.id === metric
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              style={{
                border: 'none',
                borderRadius: 9999,
                padding: '9px 12px',
                background: active
                  ? 'linear-gradient(160deg, #B5F23D 0%, #9DD530 100%)'
                  : 'linear-gradient(160deg, #1A1F26 0%, #14181D 100%)',
                color: active ? '#0A0A0A' : '#D1D5DB',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
                transform: active ? 'translateY(-1px)' : 'none',
                filter: active ? 'drop-shadow(0 5px 10px rgba(181,242,61,0.25))' : 'none',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <p style={{ margin: '9px 4px 0', fontSize: 12, color: '#8A93A3' }}>{METRICS.find((item) => item.id === metric)?.helper}</p>
    </section>
  )
}

function ChartCard({
  weeks,
  metric,
  selectedWeek,
  onSelectWeek,
}: {
  weeks: WeekPoint[]
  metric: MetricId
  selectedWeek: number
  onSelectWeek: (week: number) => void
}) {
  const max = Math.max(...weeks.map((week) => getMetricValue(week, metric)), 1)
  const accent = metric === 'adherence' ? '#56C5FA' : metric === 'volume' ? '#B5F23D' : '#F59E0B'

  return (
    <section style={glassCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Detalle semanal</p>
        <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Desliza horizontal para ver todas</p>
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 170,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          touchAction: 'pan-x',
          paddingBottom: 6,
          scrollbarWidth: 'thin' as React.CSSProperties['scrollbarWidth'],
        }}
      >
        {weeks.map((week) => {
          const value = getMetricValue(week, metric)
          const active = selectedWeek === week.week
          const barHeight = Math.max(18, Math.round((value / max) * 110))
          return (
            <button
              key={week.week}
              type="button"
              onClick={() => onSelectWeek(week.week)}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                minWidth: 58,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, color: active ? accent : '#7C8594', fontWeight: active ? 700 : 500 }}>
                {metric === 'adherence' ? `${value}%` : metric === 'volume' ? value : value.toFixed(1)}
              </span>
              <div
                style={{
                  width: 34,
                  height: barHeight,
                  borderRadius: 11,
                  background: active
                    ? `linear-gradient(180deg, ${accent} 0%, ${accent}C9 100%)`
                    : `linear-gradient(180deg, ${accent}88 0%, ${accent}55 100%)`,
                  boxShadow: active ? `0 0 0 1px ${accent}, 0 6px 18px ${accent}55` : 'none',
                  transition: 'all 0.25s ease',
                }}
              />
              <span style={{ fontSize: 11, color: active ? '#E5E7EB' : '#8A93A3', fontWeight: active ? 700 : 600 }}>S{week.week}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function VariantBlock({ variant, selected }: { variant: VariantId; selected: WeekPoint }) {
  if (variant === 'balanced') return null

  if (variant === 'analytics') {
    const risk = selected.sets > 88 ? 'Alto estres de carga' : selected.sets > 72 ? 'Carga controlada' : 'Carga moderada'
    const riskColor = selected.sets > 88 ? '#F87171' : selected.sets > 72 ? '#22C55E' : '#F59E0B'
    return (
      <section style={glassCard}>
        <p style={eyebrow}>Panel de lectura rapida</p>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <KpiBlock title="Series de alta carga" value={`${Math.round(selected.sets * 0.62)}`} helper="Series > 75% de pico" />
          <KpiBlock title="Indice de estres" value={selected.avgKg ? selected.avgKg.toFixed(1) : '--'} helper={risk} />
        </div>
        <p style={{ margin: '9px 0 0', fontSize: 12, color: riskColor, fontWeight: 700 }}>{risk}</p>
      </section>
    )
  }

  return (
    <section style={glassCard}>
      <p style={eyebrow}>Timeline de anomalias</p>
      <div style={{ marginTop: 9, display: 'flex', gap: 6 }}>
        {WEEKS.map((week) => {
          const lowAdherence = week.sessionsDone < week.sessionsPlanned
          const highLoad = (week.avgKg ?? 0) > 55
          const color = lowAdherence ? '#F87171' : highLoad ? '#22C55E' : '#B5F23D'
          return (
            <div key={week.week} style={{ flex: '0 0 auto', width: 20, textAlign: 'center' }}>
              <div style={{ width: 9, height: 9, borderRadius: 9999, margin: '0 auto', backgroundColor: color }} />
              <p style={{ margin: '5px 0 0', fontSize: 9, color: '#8A93A3' }}>{week.week}</p>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>Rojo: adherencia incompleta, verde: carga alta sostenida.</p>
    </section>
  )
}

function DetailSheet({ selected, metric, variant }: { selected: WeekPoint; metric: MetricId; variant: VariantId }) {
  const title =
    variant === 'balanced' ? 'Explicacion de la semana seleccionada' : variant === 'analytics' ? 'Diagnostico de semana' : 'Resumen narrativo'
  return (
    <section style={{ ...glassCard, background: 'linear-gradient(180deg, #10141A 0%, #0D1117 100%)', borderColor: '#29303A' }}>
      <p style={eyebrow}>{title}</p>
      <h3 style={{ margin: '6px 0 0', fontSize: 17 }}>Semana {selected.week}</h3>
      <p style={{ margin: '5px 0 0', fontSize: 13, color: '#C7CEDA' }}>{getMetricSummary(selected, metric)}</p>
      <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 6, color: '#D1D5DB', fontSize: 12 }}>
        {selected.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
  background:
    'radial-gradient(120% 45% at 50% -10%, rgba(181,242,61,0.08) 0%, rgba(181,242,61,0) 60%), linear-gradient(180deg, #080A0D 0%, #090B0E 100%)',
  color: '#F0F0F0',
  padding: '16px 14px 120px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const glassCard: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid #1F252E',
  background: 'linear-gradient(160deg, rgba(20,24,30,0.95) 0%, rgba(16,20,26,0.95) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  padding: 12,
}

const heroCard: React.CSSProperties = {
  ...glassCard,
  position: 'relative',
  overflow: 'hidden',
  padding: 14,
  borderColor: '#2A313C',
}

const kpiBlock: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #2A313B',
  background: 'linear-gradient(180deg, #141920 0%, #11161D 100%)',
  padding: '9px 10px 8px',
}

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: '#6B7280',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

export default function WeeklyLoadMockupsPage() {
  const [variant, setVariant] = useState<VariantId>('balanced')
  const [metric, setMetric] = useState<MetricId>('volume')
  const [selectedWeek, setSelectedWeek] = useState<number>(14)

  const selected = useMemo(() => WEEKS.find((week) => week.week === selectedWeek) ?? WEEKS[WEEKS.length - 1], [selectedWeek])
  const prev = useMemo(() => WEEKS.find((week) => week.week === selected.week - 1) ?? null, [selected.week])
  const variantMeta = VARIANTS.find((option) => option.id === variant) ?? VARIANTS[0]

  return (
    <main style={pageStyle}>
      <header style={{ padding: '2px 2px 6px' }}>
        <p style={eyebrow}>Mockups finales - Carga semanal</p>
        <h2 style={{ margin: '6px 0 0', fontSize: 22, lineHeight: 1.2 }}>{variantMeta.title}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#97A2B1' }}>{variantMeta.subtitle}</p>
      </header>

      <section style={{ ...glassCard, padding: 8 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {VARIANTS.map((option) => {
            const active = option.id === variant
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setVariant(option.id)}
                style={{
                  border: 'none',
                  borderRadius: 9999,
                  padding: '8px 12px',
                  background: active ? '#B5F23D' : '#1A2028',
                  color: active ? '#0A0A0A' : '#D1D5DB',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: active ? 'translateY(-1px)' : 'none',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </section>

      <HeroCard selected={selected} metric={metric} prev={prev} />
      <KpiStrip selected={selected} />
      <MetricTabs metric={metric} onChange={setMetric} />
      <ChartCard weeks={WEEKS} metric={metric} selectedWeek={selectedWeek} onSelectWeek={setSelectedWeek} />
      <VariantBlock variant={variant} selected={selected} />
      <DetailSheet selected={selected} metric={metric} variant={variant} />
    </main>
  )
}
