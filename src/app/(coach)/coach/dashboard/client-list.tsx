'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Avatar from '@/components/ui/avatar'
import ComplianceBadge from '@/components/ui/compliance-badge'
import FilterTabs from '@/components/ui/filter-tabs'
import type { DashboardClientSummary } from './queries'

type FilterTab = 'Todos' | 'Activos' | 'Pendientes' | 'Inactividad'

const TABS: FilterTab[] = ['Todos', 'Activos', 'Pendientes', 'Inactividad']

const STATUS_COLORS: Record<'active' | 'warning' | 'critical', string> = {
  active: '#B5F23D',
  warning: '#F2994A',
  critical: '#F25252',
}

function getLastActivityLabel(daysSinceLastSession: number | null): string {
  if (daysSinceLastSession === null) return 'Sin actividad'
  if (daysSinceLastSession === 0) return 'hoy'
  if (daysSinceLastSession === 1) return 'hace 1 día'
  return `hace ${daysSinceLastSession} días`
}

type ClientListProps = {
  clients: DashboardClientSummary[]
}

export default function ClientList({ clients }: ClientListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Todos')

  const filtered = clients.filter((client) => {
    switch (activeFilter) {
      case 'Activos':
        return (
          client.hasActivePlan &&
          client.daysSinceLastSession !== null &&
          client.daysSinceLastSession <= 7
        )
      case 'Pendientes':
        return client.alerts.includes('no_plan')
      case 'Inactividad':
        return (
          client.hasActivePlan &&
          client.daysSinceLastSession !== null &&
          client.daysSinceLastSession > 5
        )
      default:
        return true
    }
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
        <FilterTabs
          tabs={TABS}
          activeTab={activeFilter}
          onChange={(tab) => setActiveFilter(tab as FilterTab)}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 160px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', padding: '24px 0' }}>
            No hay clientes en esta categoría.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Link href={`/coach/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      backgroundColor: '#111317',
                      border: '1px solid #1F2227',
                      borderLeft: `3px solid ${STATUS_COLORS[client.statusColor]}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Avatar fullName={client.fullName} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#F0F0F0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.fullName}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.goal ?? 'Sin objetivo'}
                        {' · '}
                        {getLastActivityLabel(client.daysSinceLastSession)}
                      </p>
                    </div>
                    <ComplianceBadge
                      value={client.hasActivePlan ? client.weeklyCompliance : null}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
