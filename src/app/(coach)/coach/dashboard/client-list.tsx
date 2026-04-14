'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Avatar from '@/components/ui/avatar'
import FilterTabs, { type FilterTabItem } from '@/components/ui/filter-tabs'
import { COACH_LIST_SCROLL_END_ABOVE_NAV } from '@/lib/ui/safe-area'
import type { CoachClientListState, DashboardClientSummary } from './queries'

/** Franja fija bajo los chips (fuera del scroll) + solape para evitar rendijas en WebKit. */
const CHROME_BELOW_FILTERS_PX = 14
const SCROLL_OVERLAP_SEAL_PX = 2

/** Ancho máximo de tarjetas de cliente (centradas; en pantallas angostas ocupan 100%). */
const CLIENT_CARD_COLUMN_MAX_WIDTH_PX = 320

function resolveScrollPaddingBottom(
  bottomPadding: number | string | undefined,
  reserveFabSpace: boolean
): string {
  if (bottomPadding !== undefined) {
    return typeof bottomPadding === 'number' ? `${bottomPadding}px` : bottomPadding
  }
  if (reserveFabSpace) return '220px'
  return COACH_LIST_SCROLL_END_ABOVE_NAV
}

const STATE_COLORS: Record<CoachClientListState, string> = {
  al_dia: '#22C55E',
  atencion: '#F2994A',
  critico: '#F25252',
  en_pausa: '#38BDF8',
  inactivo: '#9CA3AF',
}

type FilterId = 'todos' | CoachClientListState

const FILTER_ITEMS: FilterTabItem[] = [
  {
    id: 'todos',
    label: 'Todos',
    activeBackground: '#B5F23D',
    activeColor: '#0A0A0A',
  },
  {
    id: 'al_dia',
    label: 'Al día',
    activeBackground: STATE_COLORS.al_dia,
    activeColor: '#0A0A0A',
  },
  {
    id: 'atencion',
    label: 'Atención',
    activeBackground: STATE_COLORS.atencion,
    activeColor: '#0A0A0A',
  },
  {
    id: 'critico',
    label: 'Crítico',
    activeBackground: STATE_COLORS.critico,
    activeColor: '#F0F0F0',
  },
  {
    id: 'en_pausa',
    label: 'En pausa',
    activeBackground: STATE_COLORS.en_pausa,
    activeColor: '#0A0A0A',
  },
  {
    id: 'inactivo',
    label: 'Inactivo',
    activeBackground: '#6B7280',
    activeColor: '#F0F0F0',
  },
]

function filterTabItemsWithCounts(
  clients: DashboardClientSummary[],
  activeFilter: FilterId
): FilterTabItem[] {
  const stateCount: Record<CoachClientListState, number> = {
    al_dia: 0,
    atencion: 0,
    critico: 0,
    en_pausa: 0,
    inactivo: 0,
  }
  for (const c of clients) {
    stateCount[c.listState]++
  }
  return FILTER_ITEMS.map((item) => {
    const isActive = item.id === activeFilter
    if (!isActive) {
      return { ...item, label: item.label }
    }
    const n =
      item.id === 'todos' ? clients.length : stateCount[item.id as CoachClientListState]
    return {
      ...item,
      label: item.id === 'todos' ? `Todos (${n})` : `${item.label} (${n})`,
    }
  })
}

/** Orden en vista Todos: más urgente arriba */
const STATE_SORT_RANK: Record<CoachClientListState, number> = {
  critico: 0,
  atencion: 1,
  al_dia: 2,
  en_pausa: 3,
  inactivo: 4,
}

function compareForTodosView(a: DashboardClientSummary, b: DashboardClientSummary): number {
  const ra = STATE_SORT_RANK[a.listState]
  const rb = STATE_SORT_RANK[b.listState]
  if (ra !== rb) return ra - rb

  const urgent = a.listState === 'critico' || a.listState === 'atencion'
  if (urgent) {
    const aDays = a.daysSinceLastSession ?? 10_000
    const bDays = b.daysSinceLastSession ?? 10_000
    if (bDays !== aDays) return bDays - aDays
  } else {
    const aT = a.lastSessionDate?.getTime() ?? 0
    const bT = b.lastSessionDate?.getTime() ?? 0
    if (bT !== aT) return bT - aT
  }

  return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
}

function compareByRecentActivity(a: DashboardClientSummary, b: DashboardClientSummary): number {
  const aT = a.lastSessionDate?.getTime() ?? 0
  const bT = b.lastSessionDate?.getTime() ?? 0
  if (bT !== aT) return bT - aT
  return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
}

function getClientStateLabel(listState: CoachClientListState): string {
  switch (listState) {
    case 'al_dia':
      return 'Al día'
    case 'atencion':
      return 'Atención'
    case 'critico':
      return 'Crítico'
    case 'en_pausa':
      return 'En pausa'
    case 'inactivo':
      return 'Inactivo'
  }
}

function getLastActivityLabel(daysSinceLastSession: number | null): string {
  if (daysSinceLastSession === null) return 'Sin actividad'
  if (daysSinceLastSession === 0) return 'hoy'
  if (daysSinceLastSession === 1) return 'hace 1 día'
  return `hace ${daysSinceLastSession} días`
}

type ClientListProps = {
  clients: DashboardClientSummary[]
  /** Espacio extra al final del scroll para el FAB del dashboard (desactivar en /coach/clients). */
  reserveFabSpace?: boolean
  /** Padding inferior del scroll (`px` o CSS, p. ej. para safe area). Si no se pasa, se deriva de `reserveFabSpace`. */
  bottomPadding?: number | string
}

export default function ClientList({ clients, reserveFabSpace = true, bottomPadding }: ClientListProps) {
  const scrollPaddingBottom = resolveScrollPaddingBottom(bottomPadding, reserveFabSpace)
  const [activeFilter, setActiveFilter] = useState<FilterId>('todos')
  const filterTabItems = useMemo(
    () => filterTabItemsWithCounts(clients, activeFilter),
    [clients, activeFilter]
  )

  const sortedClients = [...clients].sort((a, b) =>
    activeFilter === 'todos' ? compareForTodosView(a, b) : compareByRecentActivity(a, b)
  )

  const filtered = sortedClients.filter((client) => {
    if (activeFilter === 'todos') return true
    return client.listState === activeFilter
  })

  const emptyFilterLabel =
    activeFilter === 'todos'
      ? 'esta vista'
      : (FILTER_ITEMS.find((t) => t.id === activeFilter)?.label ?? 'este filtro').toLowerCase()

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0A0A0A',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 3,
          backgroundColor: '#0A0A0A',
          marginBottom: -SCROLL_OVERLAP_SEAL_PX,
        }}
      >
        <div style={{ padding: '6px 20px 0' }}>
          <FilterTabs
            items={filterTabItems}
            activeId={activeFilter}
            onChange={(id) => setActiveFilter(id as FilterId)}
          />
        </div>
        <div
          aria-hidden
          style={{
            height: CHROME_BELOW_FILTERS_PX,
            backgroundColor: '#0A0A0A',
            width: '100%',
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
          scrollPaddingTop: CHROME_BELOW_FILTERS_PX,
          WebkitOverflowScrolling: 'touch',
          padding: 0,
          paddingTop: SCROLL_OVERLAP_SEAL_PX,
          paddingBottom: scrollPaddingBottom,
          backgroundColor: '#0A0A0A',
          position: 'relative',
          zIndex: 0,
          isolation: 'isolate',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '8px 20px 0',
            minHeight: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: CLIENT_CARD_COLUMN_MAX_WIDTH_PX,
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
          {filtered.length === 0 ? (
            <div
              style={{
                backgroundColor: '#111317',
                border: '1px solid #1F2227',
                borderRadius: 14,
                padding: '16px 14px',
              }}
            >
              <p style={{ fontSize: 13, color: '#F0F0F0', fontWeight: 600 }}>
                Sin clientes en {emptyFilterLabel}.
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Probá otro filtro o agregá un nuevo cliente desde el botón +.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((client, i) => {
                const accent = STATE_COLORS[client.listState]
                return (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                style={{
                  position: 'relative',
                  zIndex: 0,
                  scrollMarginTop: CHROME_BELOW_FILTERS_PX + 8,
                  scrollMarginBottom: 12,
                }}
              >
                <Link href={`/coach/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background: 'linear-gradient(165deg, #12161C 0%, #0F1217 100%)',
                      border: '1px solid #252A31',
                      borderLeft: `3px solid ${accent}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
                    }}
                  >
                    <Avatar fullName={client.fullName} ringColor={accent} size="md" />
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
                          color: accent,
                          marginTop: 2,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {getClientStateLabel(client.listState)}
                      </p>
                    </div>
                    {client.hasActivePlan ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: '#B5F23D',
                          fontWeight: 600,
                          flexShrink: 0,
                          textAlign: 'right',
                        }}
                      >
                        {getLastActivityLabel(client.daysSinceLastSession)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
              )
            })}
          </AnimatePresence>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
