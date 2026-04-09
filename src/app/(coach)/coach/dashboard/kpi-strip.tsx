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
      ? '= igual'
      : trendPositive
      ? `↑ ${momentumPercent}%`
      : `↓ ${Math.abs(momentumPercent)}%`

  return (
    <div style={{ display: 'flex', gap: 12, padding: '0 20px' }}>
      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
      >
        <StatCard label="Clientes" value={totalClients} />
      </motion.div>

      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.04 }}
      >
        <StatCard label="Activos" value={activeClients} valueColor="#B5F23D" />
      </motion.div>

      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
      >
        <StatCard label="Esta semana" value="">
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: trendPositive ? '#B5F23D' : '#F2994A',
                marginBottom: 6,
              }}
            >
              {trendLabel}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 24 }}>
              {sparklineData.map((count, i) => {
                const height = Math.max(4, Math.round((count / maxSessions) * 24))
                const filled = count > 0
                return (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height,
                      borderRadius: 2,
                      backgroundColor: filled ? '#B5F23D' : '#1A1D22',
                      flex: 1,
                    }}
                  />
                )
              })}
            </div>
          </div>
        </StatCard>
      </motion.div>
    </div>
  )
}
