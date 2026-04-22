'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { BodyWeightPoint } from './queries'

const T = {
  card: '#111317', border: '#1F2227', lime: '#B5F23D',
  text: '#F0F0F0', muted: '#6B7280',
} as const

export default function BodyWeightChart({ data }: { data: BodyWeightPoint[] }) {
  if (data.length < 2) {
    return (
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 16px' }}>
        <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', margin: 0 }}>
          {data.length === 0
            ? 'No hay mediciones de peso registradas todavía.'
            : 'Registrá al menos 2 mediciones para ver la curva.'}
        </p>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const first = data[0]
  const diff = latest.weightKg - first.weightKg
  const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>Peso actual</p>
          <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 800, color: T.text }}>
            {latest.weightKg} <span style={{ fontSize: 16, fontWeight: 400 }}>kg</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: T.muted }}>Desde el inicio</p>
          <p style={{
            margin: '2px 0 0', fontSize: 16, fontWeight: 700,
            color: diff <= 0 ? T.lime : '#F25252',
          }}>
            {diffStr} kg
          </p>
        </div>
      </div>
      <div style={{ padding: '12px 0 8px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B5F23D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#B5F23D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1D23', border: `1px solid #1F2227`,
                borderRadius: 8, fontSize: 12, color: T.text,
              }}
              formatter={(v) => [`${v} kg`, 'Peso']}
            />
            <Area
              type="monotone"
              dataKey="weightKg"
              stroke={T.lime}
              strokeWidth={2}
              fill="url(#weightGrad)"
              dot={{ r: 3, fill: T.lime, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
