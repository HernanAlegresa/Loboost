'use client'

import { motion } from 'framer-motion'
import StatCard from '@/components/ui/stat-card'

type KpiStripProps = {
  totalClients: number
  activeClients: number
  momentumPercent: number
  sparklineData: number[]
}

export default function KpiStrip({
  totalClients,
  activeClients,
  momentumPercent,
  sparklineData,
}: KpiStripProps) {
  const maxSessions = Math.max(...sparklineData, 1)
  const trendPositive = momentumPercent >= 0
  const trendLabel =
    momentumPercent === 0
      ? '='
      : trendPositive
      ? `↑ ${momentumPercent}%`
      : `↓ ${Math.abs(momentumPercent)}%`

  // sparklineData[0]=Lun … [6]=Dom — siempre fijo
  const BAR_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 20px', alignItems: 'stretch' }}>
      {/* Clientes — estrecho, centrado */}
      <motion.div
        style={{ flex: 0.75, display: 'flex' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
      >
        <StatCard label="Clientes" value={totalClients} centered />
      </motion.div>

      {/* Activos — estrecho, centrado */}
      <motion.div
        style={{ flex: 0.75, display: 'flex' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.04 }}
      >
        <StatCard label="Activos" value={activeClients} valueColor="#B5F23D" centered />
      </motion.div>

      {/* Esta semana — ancho, sparkline */}
      <motion.div
        style={{ flex: 1.5, display: 'flex' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
      >
        <StatCard
          label="Esta semana"
          value=""
          labelRight={
            <span style={{ fontSize: 11, fontWeight: 600, color: trendPositive ? '#B5F23D' : '#F2994A' }}>
              {trendLabel}
            </span>
          }
        >
          {/* Barras + letras de días */}
          <div style={{ display: 'flex', gap: 3, width: '100%' }}>
            {sparklineData.map((count, i) => {
              const barH = Math.max(4, Math.round((count / maxSessions) * 28))
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {/* Barra */}
                  <div style={{ height: 28, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: barH,
                        borderRadius: 3,
                        backgroundColor: count > 0 ? '#B5F23D' : '#1A1D22',
                      }}
                    />
                  </div>
                  {/* Letra del día */}
                  <span style={{ fontSize: 9, fontWeight: 500, color: '#6B7280' }}>
                    {BAR_DAYS[i]}
                  </span>
                </div>
              )
            })}
          </div>
        </StatCard>
      </motion.div>
    </div>
  )
}
