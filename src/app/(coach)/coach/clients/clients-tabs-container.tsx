'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { DashboardClientSummary } from '../dashboard/queries'
import { isPlanExpired } from '@/features/clients/utils/training-utils'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import ClientCard from './client-card'
import type { ClientStatus } from '@/features/clients/types/client-status'

type ClientHealthState = 'en_riesgo' | 'atrasado' | 'al_dia' | 'sin_plan'
import ClientsFilters, { type ClientsFilterId } from './clients-filters'
import ActivityFeedItem from './activity-feed-item'
import ClientsStatesInfoSheet from './clients-states-info-sheet'

type ClientsTab = 'clients' | 'activity'

type Props = {
  clients: DashboardClientSummary[]
}

type ClientListItem = {
  id: string
  fullName: string
  state: ClientHealthState
  status: ClientStatus
  completedThisWeek: number
  plannedDaysPerWeek: number
  daysSinceLastSession: number | null
  planExpired: boolean
}

type ActivityItem = {
  id: string
  clientId: string
  fullName: string
  eventText: string
  timeLabel: string
  severityRank: number
  ageDays: number
}

const TAB_LABELS: Record<ClientsTab, string> = {
  clients: 'Clientes',
  activity: 'Actividad',
}

const LIST_BOTTOM_GAP_PX = 28

/**
 * Aire bajo la última fila al hacer scroll al final. El `viewportRef` ya deja
 * `marginBottom` para la bottom nav (`SAFE_BOTTOM_NAV_HEIGHT` + gap); 120px
 * duplicaba ese espacio y dejaba la última carta demasiado arriba.
 */
const SCROLL_END_PADDING_BOTTOM_PX = 32
const CLIENT_CARD_COLUMN_MAX_WIDTH_PX = 320

/** Espacio entre el texto Clientes/Actividad y la línea lima activa (más chico = más cerca del texto). */
const TAB_INDICATOR_MARGIN_TOP_PX = 3

/** Mismo inset vertical: entre la línea de tabs y los filtros, y entre filtros y la lista. */
const FILTERS_VERTICAL_INSET_PX = 22

/** Celeste del ícono “i” (un poco transparente para que no compita con los tabs) */
const CLIENTS_TAB_INFO_CELESTE = 'rgba(86, 197, 250, 0.72)'

const STATE_SORT_RANK: Record<ClientHealthState, number> = {
  en_riesgo: 0,
  atrasado: 1,
  al_dia: 2,
  sin_plan: 3,
}

function mapToHealthState(client: DashboardClientSummary): ClientHealthState {
  if (!client.hasActivePlan) return 'sin_plan'
  if (client.status === 'riesgo') return 'en_riesgo'
  if (client.status === 'atencion') return 'atrasado'
  return 'al_dia'
}

function getTimeLabel(days: number | null): string {
  if (days === null) return 'Sin registros'
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function buildActivityItem(client: ClientListItem): ActivityItem {
  const ageDays = client.daysSinceLastSession ?? 999
  const timeLabel = getTimeLabel(client.daysSinceLastSession)

  if (client.state === 'en_riesgo') {
    return {
      id: `risk-${client.id}`,
      clientId: client.id,
      fullName: client.fullName,
      eventText:
        client.daysSinceLastSession === null
          ? 'pasó a En riesgo por falta de registros.'
          : `no registra hace ${client.daysSinceLastSession} días.`,
      timeLabel,
      severityRank: 0,
      ageDays,
    }
  }

  if (client.state === 'atrasado') {
    return {
      id: `late-${client.id}`,
      clientId: client.id,
      fullName: client.fullName,
      eventText: `completó ${client.completedThisWeek} de ${client.plannedDaysPerWeek} esta semana.`,
      timeLabel,
      severityRank: 1,
      ageDays,
    }
  }

  if (client.state === 'sin_plan') {
    return {
      id: `no-plan-${client.id}`,
      clientId: client.id,
      fullName: client.fullName,
      eventText: 'está sin plan activo.',
      timeLabel: 'Sin plan',
      severityRank: 3,
      ageDays: 999,
    }
  }

  if (client.daysSinceLastSession !== null && client.daysSinceLastSession <= 1) {
    return {
      id: `recent-${client.id}`,
      clientId: client.id,
      fullName: client.fullName,
      eventText: 'volvió a registrar entrenamiento.',
      timeLabel,
      severityRank: 2,
      ageDays,
    }
  }

  return {
    id: `ok-${client.id}`,
    clientId: client.id,
    fullName: client.fullName,
    eventText: `completó ${client.completedThisWeek} de ${client.plannedDaysPerWeek} esta semana.`,
    timeLabel,
    severityRank: 2,
    ageDays,
  }
}

export default function ClientsTabsContainer({ clients }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const tabsTrackRef = useRef<HTMLDivElement | null>(null)
  const tabTextRefs = useRef<Record<ClientsTab, HTMLSpanElement | null>>({
    clients: null,
    activity: null,
  })
  const [activeTab, setActiveTab] = useState<ClientsTab>('clients')
  const [panelWidth, setPanelWidth] = useState(0)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [activeFilter, setActiveFilter] = useState<ClientsFilterId>('todos')
  const [statesInfoOpen, setStatesInfoOpen] = useState(false)
  const searchParams = useSearchParams()

  const tabs: ClientsTab[] = useMemo(() => ['clients', 'activity'], [])

  const normalizedClients = useMemo<ClientListItem[]>(
    () =>
      clients.map((client) => ({
        id: client.id,
        fullName: client.fullName,
        state: mapToHealthState(client),
        status: client.status,
        completedThisWeek: client.completedThisWeek,
        plannedDaysPerWeek: client.daysPerWeek,
        daysSinceLastSession: client.daysSinceLastSession,
        planExpired: isPlanExpired(client.activePlanEndDate),
      })),
    [clients]
  )

  const counts = useMemo<Record<ClientsFilterId, number>>(() => {
    const base: Record<ClientsFilterId, number> = {
      todos: normalizedClients.length,
      en_riesgo: 0,
      atrasado: 0,
      al_dia: 0,
      sin_plan: 0,
    }
    for (const client of normalizedClients) {
      base[client.state] += 1
    }
    return base
  }, [normalizedClients])

  const filteredClients = useMemo(() => {
    const list = normalizedClients.filter((client) =>
      activeFilter === 'todos' ? true : client.state === activeFilter
    )
    return list.sort((a, b) => {
      const rankDiff = STATE_SORT_RANK[a.state] - STATE_SORT_RANK[b.state]
      if (rankDiff !== 0) return rankDiff
      const aAge = a.daysSinceLastSession ?? 999
      const bAge = b.daysSinceLastSession ?? 999
      if (a.state === 'en_riesgo' || a.state === 'atrasado') return bAge - aAge
      return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
    })
  }, [normalizedClients, activeFilter])

  const activityItems = useMemo(
    () =>
      normalizedClients
        .map(buildActivityItem)
        .sort((a, b) => {
          if (a.severityRank !== b.severityRank) return a.severityRank - b.severityRank
          if (a.ageDays !== b.ageDays) return a.ageDays - b.ageDays
          return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
        }),
    [normalizedClients]
  )

  useEffect(() => {
    function syncPanelWidth() {
      const viewport = viewportRef.current
      if (!viewport) return
      setPanelWidth(viewport.clientWidth)
    }

    const viewport = viewportRef.current
    if (!viewport) return

    syncPanelWidth()
    const observer = new ResizeObserver(syncPanelWidth)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function syncIndicator() {
      const track = tabsTrackRef.current
      const textEl = tabTextRefs.current[activeTab]
      if (!track || !textEl) return
      const trackRect = track.getBoundingClientRect()
      const textRect = textEl.getBoundingClientRect()
      setIndicator({
        left: textRect.left - trackRect.left,
        width: textRect.width,
      })
    }

    syncIndicator()
    const raf = requestAnimationFrame(syncIndicator)
    return () => cancelAnimationFrame(raf)
  }, [activeTab, panelWidth])

  function scrollToTab(tab: ClientsTab) {
    const viewport = viewportRef.current
    if (!viewport) return
    const index = tabs.indexOf(tab)
    if (index < 0) return
    viewport.scrollTo({
      left: viewport.clientWidth * index,
      behavior: 'smooth',
    })
    setActiveTab(tab)
  }

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    const tabFromUrl: ClientsTab = requestedTab === 'activity' ? 'activity' : 'clients'
    setActiveTab(tabFromUrl)
    const viewport = viewportRef.current
    if (!viewport) return
    const index = tabs.indexOf(tabFromUrl)
    if (index < 0) return
    viewport.scrollTo({
      left: viewport.clientWidth * index,
      behavior: 'auto',
    })
  }, [searchParams, tabs])

  function handleViewportScroll() {
    const viewport = viewportRef.current
    if (!viewport) return
    const width = viewport.clientWidth
    if (width <= 0) return
    const index = Math.round(viewport.scrollLeft / width)
    const nextTab = tabs[Math.min(Math.max(index, 0), tabs.length - 1)]
    if (nextTab !== activeTab) setActiveTab(nextTab)
  }

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
          flexShrink: 0,
          padding: '10px 20px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {/* Misma franja vertical que la fila de “Clientes / Actividad” (no el indicador lima) */}
          <div
            style={{
              flexShrink: 0,
              width: 40,
              minHeight: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginLeft: -4,
            }}
          >
            <motion.button
              type="button"
              aria-label="Información sobre estados de clientes"
              onClick={() => setStatesInfoOpen(true)}
              whileTap={{ scale: 0.85, opacity: 0.7 }}
              transition={{ duration: 0.1 }}
              style={{
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: CLIENTS_TAB_INFO_CELESTE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px 6px 0',
                lineHeight: 1.2,
              }}
            >
              <Info size={20} strokeWidth={2.35} aria-hidden color={CLIENTS_TAB_INFO_CELESTE} />
            </motion.button>
          </div>
          <div
            ref={tabsTrackRef}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              minWidth: 0,
              minHeight: 46,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 64,
                minHeight: 46,
              }}
            >
              {tabs.map((tab) => {
                const isActive = tab === activeTab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => scrollToTab(tab)}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: isActive ? '#F0F0F0' : '#6B7280',
                      padding: '6px 0',
                      fontSize: isActive ? 20 : 18,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      transition: 'color 140ms ease',
                    }}
                  >
                    <span
                      ref={(node) => {
                        tabTextRefs.current[tab] = node
                      }}
                    >
                      {TAB_LABELS[tab]}
                    </span>
                  </button>
                )
              })}
            </div>
            <div
              style={{
                marginTop: TAB_INDICATOR_MARGIN_TOP_PX,
                marginBottom: 0,
                height: 2,
                position: 'relative',
                width: '100%',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: indicator.left,
                  height: 2,
                  width: indicator.width,
                  backgroundColor: '#B5F23D',
                  borderRadius: 9999,
                  transition: 'left 220ms ease, width 220ms ease',
                }}
              />
            </div>
          </div>
          <div
            style={{ width: 40, flexShrink: 0, minHeight: 46 }}
            aria-hidden
          />
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={handleViewportScroll}
        style={{
          flex: 1,
          minHeight: 0,
          marginBottom: `calc(${SAFE_BOTTOM_NAV_HEIGHT} + ${LIST_BOTTOM_GAP_PX}px)`,
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'none',
        }}
      >
        <section
          aria-label="Listado de clientes"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            minHeight: 0,
            scrollSnapAlign: 'start',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#0A0A0A',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'center',
              padding: '24px 20px 12px',
              backgroundColor: '#0A0A0A',
            }}
          >
            <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}>
              <Link
                href="/coach/clients/new"
                aria-label="Crear cliente"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#B5F23D',
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <Plus size={24} color="#0A0A0A" strokeWidth={2.5} />
              </Link>
            </motion.div>
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: `${FILTERS_VERTICAL_INSET_PX}px 20px ${FILTERS_VERTICAL_INSET_PX}px`,
              backgroundColor: '#0A0A0A',
            }}
          >
            <ClientsFilters
              activeFilter={activeFilter}
              onChange={setActiveFilter}
              counts={counts}
            />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'contain',
              scrollbarGutter: 'stable',
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 0,
              paddingBottom: SCROLL_END_PADDING_BOTTOM_PX,
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
                gap: 12,
              }}
            >
              <AnimatePresence mode="popLayout">
                {filteredClients.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '48px 24px',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(181, 242, 61, 0.08)',
                        border: '1px solid rgba(181, 242, 61, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                      }}
                    >
                      👥
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>
                      {activeFilter === 'todos' ? 'Todavía no tenés clientes' : 'Sin clientes en esta categoría'}
                    </p>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                      {activeFilter === 'todos'
                        ? 'Creá tu primer cliente para empezar.'
                        : 'Probá cambiando el filtro.'}
                    </p>
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      clientId={client.id}
                      fullName={client.fullName}
                      status={client.status}
                      completedThisWeek={client.completedThisWeek}
                      plannedDaysPerWeek={client.plannedDaysPerWeek}
                      planExpired={client.planExpired}
                      daysSinceLastSession={client.daysSinceLastSession}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section
          aria-label="Actividad de clientes"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            minHeight: 0,
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            backgroundColor: '#0A0A0A',
            padding: `14px 20px ${SCROLL_END_PADDING_BOTTOM_PX}px`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {activityItems.map((item) => (
                <ActivityFeedItem
                  key={item.id}
                  clientId={item.clientId}
                  fullName={item.fullName}
                  eventText={item.eventText}
                  timeLabel={item.timeLabel}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <ClientsStatesInfoSheet open={statesInfoOpen} onClose={() => setStatesInfoOpen(false)} />
    </div>
  )
}
