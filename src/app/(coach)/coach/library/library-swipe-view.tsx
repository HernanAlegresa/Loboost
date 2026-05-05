'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClipboardList, Dumbbell } from 'lucide-react'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import CoachExpandableFab from '@/components/ui/coach-expandable-fab'
import ExerciseList from './exercises/exercise-list'
import PlanList from './plans/plan-list'
import type { ExerciseRow } from './exercises/queries'
import type { PlanListRow } from './plans/queries'

type LibraryTab = 'exercises' | 'plans'

const TAB_LABELS: Record<LibraryTab, string> = {
  exercises: 'EJERCICIOS',
  plans: 'PLANES',
}

const PANEL_BOTTOM_PADDING_PX = 120
const LIBRARY_LIST_BOTTOM_GAP_PX = 28
const LIBRARY_LIST_TOP_INSET_PX = 22

type Props = {
  exercises: ExerciseRow[]
  plans: PlanListRow[]
}

/** Alineado con Clientes: misma distancia texto-indicador. */
const TAB_INDICATOR_MARGIN_TOP_PX = 3

export default function LibrarySwipeView({ exercises, plans }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const tabsTrackRef = useRef<HTMLDivElement | null>(null)
  const tabTextRefs = useRef<Record<LibraryTab, HTMLSpanElement | null>>({
    exercises: null,
    plans: null,
  })
  const [activeTab, setActiveTab] = useState<LibraryTab>('exercises')
  const [panelWidth, setPanelWidth] = useState(0)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const searchParams = useSearchParams()

  const tabs: LibraryTab[] = useMemo(() => ['exercises', 'plans'], [])

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

  function scrollToTab(tab: LibraryTab) {
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
    const tabFromUrl: LibraryTab = requestedTab === 'plans' ? 'plans' : 'exercises'
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
    if (nextTab !== activeTab) {
      setActiveTab(nextTab)
    }
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
          padding: '6px 20px 0',
          position: 'relative',
          zIndex: 19,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ width: 40, flexShrink: 0, minHeight: 46 }} aria-hidden />
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
                minHeight: 42,
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
                      fontSize: isActive ? 16 : 14,
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: '0.04em',
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
          <div style={{ width: 40, flexShrink: 0, minHeight: 46 }} aria-hidden />
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: '24px 20px 12px',
          backgroundColor: '#0A0A0A',
        }}
      >
        <CoachExpandableFab
          expandDirection="down"
          menuOffsetPx={20}
          actionsGapPx={22}
          fabAriaLabel="Abrir acciones de biblioteca"
          actions={[
            {
              label: 'Nuevo ejercicio',
              href: '/coach/library/exercises/new',
              icon: Dumbbell,
            },
            {
              label: 'Nuevo plan',
              href: '/coach/library/plans/new',
              icon: ClipboardList,
            },
          ]}
        />
      </div>

      <div
        ref={viewportRef}
        onScroll={handleViewportScroll}
        style={{
          flex: 1,
          minHeight: 0,
          marginBottom: `calc(${SAFE_BOTTOM_NAV_HEIGHT} + ${LIBRARY_LIST_BOTTOM_GAP_PX}px)`,
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
          aria-label="Biblioteca de ejercicios"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            minHeight: 0,
            scrollSnapAlign: 'start',
            overflowY: 'hidden',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            padding: '0 20px',
            backgroundColor: '#0A0A0A',
          }}
        >
          <ExerciseList exercises={exercises} />
        </section>

        <section
          aria-label="Biblioteca de planes"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            padding: `${LIBRARY_LIST_TOP_INSET_PX}px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
            backgroundColor: '#0A0A0A',
          }}
        >
          <PlanList plans={plans} />
        </section>
      </div>
    </div>
  )
}
