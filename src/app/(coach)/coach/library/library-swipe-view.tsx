'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'
import ExerciseList from './exercises/exercise-list'
import PlanList from './plans/plan-list'
import type { ExerciseRow } from './exercises/queries'
import type { PlanListRow } from './plans/queries'

type LibraryTab = 'exercises' | 'plans'

const TAB_LABELS: Record<LibraryTab, string> = {
  exercises: 'Ejercicios',
  plans: 'Planes',
}

const TAB_ADD_HREF: Record<LibraryTab, string> = {
  exercises: '/coach/library/exercises/new',
  plans: '/coach/library/plans/new',
}

const PANEL_BOTTOM_PADDING_PX = 120
const LIBRARY_LIST_BOTTOM_GAP_PX = 28

type Props = {
  exercises: ExerciseRow[]
  plans: PlanListRow[]
}

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
          padding: '10px 20px 0',
        }}
      >
        <div
          ref={tabsTrackRef}
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 60,
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
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  transition: 'color 140ms ease',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
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
            marginTop: 8,
            marginBottom: 0,
            height: 2,
            position: 'relative',
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
            href={TAB_ADD_HREF[activeTab]}
            aria-label={activeTab === 'exercises' ? 'Crear ejercicio' : 'Crear plan'}
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
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            padding: `10px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
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
            padding: `10px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
            backgroundColor: '#0A0A0A',
          }}
        >
          <PlanList plans={plans} />
        </section>
      </div>
    </div>
  )
}
