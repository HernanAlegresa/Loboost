'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'

type ClientProfileTab = 'profile' | 'progress'

const TAB_LABELS: Record<ClientProfileTab, string> = {
  profile: 'Perfil',
  progress: 'Progreso',
}

const TABS: ClientProfileTab[] = ['profile', 'progress']
const LIST_BOTTOM_GAP_PX = 0
const PANEL_BOTTOM_PADDING_PX = 120
const TAB_INDICATOR_MARGIN_TOP_PX = 3
const PROFILE_SECTION_GAP_PX = 32
const PROGRESS_SECTION_GAP_PX = 24

type Props = {
  profileContent: React.ReactNode
  progressContent: React.ReactNode
}

export default function ClientProfileTabsShell({ profileContent, progressContent }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const tabsTrackRef = useRef<HTMLDivElement | null>(null)
  const tabTextRefs = useRef<Record<ClientProfileTab, HTMLSpanElement | null>>({
    profile: null,
    progress: null,
  })
  const [activeTab, setActiveTab] = useState<ClientProfileTab>('profile')
  const [panelWidth, setPanelWidth] = useState(0)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const tabs = useMemo(() => TABS, [])

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

  function scrollToTab(tab: ClientProfileTab) {
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
    <>
      <div
        style={{
          flexShrink: 0,
          padding: '10px 20px 0',
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

          <div style={{ width: 40, flexShrink: 0, minHeight: 46 }} aria-hidden />
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
          aria-label="Datos del perfil del cliente"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            minHeight: 0,
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: `24px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
            backgroundColor: '#0A0A0A',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: PROFILE_SECTION_GAP_PX }}>
            {profileContent}
          </div>
        </section>

        <section
          aria-label="Progreso y seguimiento del cliente"
          style={{
            flex: '0 0 100%',
            minWidth: 0,
            minHeight: 0,
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: `20px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
            backgroundColor: '#0A0A0A',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: PROGRESS_SECTION_GAP_PX }}>
            {progressContent}
          </div>
        </section>
      </div>
    </>
  )
}
