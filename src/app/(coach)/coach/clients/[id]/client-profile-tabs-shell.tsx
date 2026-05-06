'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'

type ClientProfileTab = 'profile' | 'progress' | 'sessions'

const TAB_LABELS: Record<ClientProfileTab, string> = {
  profile: 'PERFIL',
  progress: 'PROGRESO',
  sessions: 'SESIONES',
}

const TABS: ClientProfileTab[] = ['profile', 'progress', 'sessions']
const LIST_BOTTOM_GAP_PX = 0
const PANEL_BOTTOM_PADDING_PX = 120
const PROFILE_SECTION_GAP_PX = 32
const PROGRESS_SECTION_GAP_PX = 24
const TAB_ACTIVE_INDICATOR_MARGIN_TOP_PX = 3

type Props = {
  profileContent: React.ReactNode
  progressContent: React.ReactNode
  sessionsContent: React.ReactNode
}

export default function ClientProfileTabsShell({ profileContent, progressContent, sessionsContent }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<ClientProfileTab>('profile')

  // On mount: if ?tab=... is in the URL, jump to that panel instantly
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam !== 'progress' && tabParam !== 'sessions' && tabParam !== 'profile') return
    const targetTab = tabParam as ClientProfileTab
    const tabIndex = TABS.indexOf(targetTab)
    if (tabIndex < 0) return
    setActiveTab(targetTab)
    // Double rAF so layout has settled before we set scrollLeft
    let r1: number
    let r2: number
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const vp = viewportRef.current
        if (vp && vp.clientWidth > 0) vp.scrollLeft = vp.clientWidth * tabIndex
      })
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [])

  const tabs = useMemo(() => TABS, [])

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

  const activeIndex = tabs.indexOf(activeTab)
  const prevTab = activeIndex > 0 ? tabs[activeIndex - 1] : null
  const nextTab = activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : null

  return (
    <>
      <div
        style={{
          flexShrink: 0,
          padding: '6px 20px 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            minHeight: 46,
            columnGap: 40,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
            {prevTab ? (
              <button
                type="button"
                onClick={() => scrollToTab(prevTab)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  padding: '6px 0',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                }}
              >
                {TAB_LABELS[prevTab]}
              </button>
            ) : (
              <div aria-hidden style={{ minHeight: 34 }} />
            )}
          </div>

          <button
            type="button"
            onClick={() => scrollToTab(activeTab)}
            style={{
              border: 'none',
              cursor: 'default',
              backgroundColor: 'transparent',
              color: '#F0F0F0',
              padding: `6px 0 ${TAB_ACTIVE_INDICATOR_MARGIN_TOP_PX}px`,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '0.04em',
              lineHeight: 1.2,
              borderBottom: '2px solid #B5F23D',
            }}
          >
            {TAB_LABELS[activeTab]}
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
            {nextTab ? (
              <button
                type="button"
                onClick={() => scrollToTab(nextTab)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  padding: '6px 0',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                }}
              >
                {TAB_LABELS[nextTab]}
              </button>
            ) : (
              <div aria-hidden style={{ minHeight: 34 }} />
            )}
          </div>
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
            padding: `24px 20px ${PANEL_BOTTOM_PADDING_PX}px`,
            backgroundColor: '#0A0A0A',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: PROGRESS_SECTION_GAP_PX }}>
            {progressContent}
          </div>
        </section>

        <section
          aria-label="Sesiones del cliente"
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
            {sessionsContent}
          </div>
        </section>
      </div>
    </>
  )
}
