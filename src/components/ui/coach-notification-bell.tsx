'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { COACH_HEADER_TOTAL_HEIGHT, SAFE_BOTTOM_NAV_HEIGHT } from '@/lib/ui/safe-area'

type Props = {
  riskCount: number
  pendingCount: number
}

/** Mismo velo que `clients-states-info-sheet` (detrás del panel de información). */
const NOTIF_BACKDROP_SCRIM = 'rgba(4, 5, 7, 0.78)'

const NOTIF_OVERLAY_Z = 175
const COACH_HEADER_OVERLAY_EVENT = 'coach-header-overlay-open'
const NOTIF_PANEL_OPEN_DELAY_MS = 120

/** Ancho de la columna del icono (misma lógica que el panel de estados: título centrado entre dos ranuras). */
const NOTIF_HEADER_SIDE_SLOT_PX = 44

/** Empuja la campana hacia el centro del panel (desde el borde izquierdo). */
const NOTIF_HEADER_BELL_PADDING_LEFT_PX = 16

/** Borde del badge: mismo contraste que en el header; en el panel también funciona sobre #111317. */
const NOTIF_BADGE_RING = '#0A0A0A'

/** Esquina superior derecha del icono (valores negativos = hacia afuera, no tapa la campana). */
const NOTIF_BADGE_TOP_PX = -8
const NOTIF_BADGE_RIGHT_PX = -6
const NOTIF_SECONDARY_TEXT_COLOR = 'rgba(255, 255, 255, 0.6)'

type CoachNotificationItem = {
  id: 'risk' | 'pending'
  mainText: string
  secondaryText: string
  color: string
}

function BellWithCountBadge({ count, bellColor }: { count: number; bellColor: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', lineHeight: 0 }}>
      <Bell size={20} color={bellColor} />
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: NOTIF_BADGE_TOP_PX,
            right: NOTIF_BADGE_RIGHT_PX,
            minWidth: 16,
            height: 16,
            zIndex: 1,
            padding: '0 4px',
            borderRadius: 9999,
            backgroundColor: '#F25252',
            color: '#F0F0F0',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1.5px solid ${NOTIF_BADGE_RING}`,
            lineHeight: 1,
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}

export default function CoachNotificationBell({ riskCount, pendingCount }: Props) {
  const [open, setOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) {
      setPanelVisible(false)
      return
    }
    const timer = window.setTimeout(() => {
      setPanelVisible(true)
    }, NOTIF_PANEL_OPEN_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    function onOtherOverlayOpened(event: Event) {
      const customEvent = event as CustomEvent<'search' | 'notifications'>
      if (customEvent.detail !== 'notifications') setOpen(false)
    }
    window.addEventListener(COACH_HEADER_OVERLAY_EVENT, onOtherOverlayOpened as EventListener)
    return () => window.removeEventListener(COACH_HEADER_OVERLAY_EVENT, onOtherOverlayOpened as EventListener)
  }, [])

  useEffect(() => {
    if (!open) return
    window.dispatchEvent(
      new CustomEvent<'search' | 'notifications'>(COACH_HEADER_OVERLAY_EVENT, {
        detail: 'notifications',
      })
    )
  }, [open])

  const notifications: CoachNotificationItem[] = []

  if (riskCount > 0) {
    notifications.push({
      id: 'risk',
      mainText: riskCount === 1 ? '1 cliente en riesgo' : `${riskCount} clientes en riesgo`,
      secondaryText: 'Revisá la lista en Clientes.',
      color: '#F25252',
    })
  }

  if (pendingCount > 0) {
    notifications.push({
      id: 'pending',
      mainText:
        pendingCount === 1 ? '1 cliente pendiente' : `${pendingCount} clientes pendientes`,
      secondaryText: 'Revisá la lista en Clientes.',
      color: '#F2C94A',
    })
  }

  const totalClientsWithNotifications = riskCount + pendingCount
  const bellColor = totalClientsWithNotifications > 0 ? '#F0F0F0' : '#E5E7EB'

  const overlay =
    mounted ? (
      <AnimatePresence>
        {open ? (
          <motion.div
            key="coach-notif-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: NOTIF_OVERLAY_Z,
              pointerEvents: 'none',
            }}
          >
            <div
              role="presentation"
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute',
                top: COACH_HEADER_TOTAL_HEIGHT,
                left: 0,
                right: 0,
                bottom: SAFE_BOTTOM_NAV_HEIGHT,
                pointerEvents: 'auto',
                backgroundColor: NOTIF_BACKDROP_SCRIM,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            />
            {panelVisible ? (
              <div
                style={{
                  position: 'absolute',
                  top: `calc(${COACH_HEADER_TOTAL_HEIGHT} + 10px)`,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  paddingLeft: 16,
                  paddingRight: 16,
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="coach-notif-heading"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    width: '100%',
                    maxWidth: 300,
                    pointerEvents: 'auto',
                    backgroundColor: 'rgba(37, 42, 49, 0.9)',
                    border: '1px solid #2A2D34',
                    borderRadius: 16,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                  }}
                >
              <div
                style={{
                  padding: '16px 0 12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                  display: 'grid',
                  gridTemplateColumns: `${NOTIF_HEADER_SIDE_SLOT_PX}px 1fr ${NOTIF_HEADER_SIDE_SLOT_PX}px`,
                  alignItems: 'center',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingLeft: NOTIF_HEADER_BELL_PADDING_LEFT_PX,
                    boxSizing: 'border-box',
                    lineHeight: 0,
                  }}
                >
                  <BellWithCountBadge count={totalClientsWithNotifications} bellColor={bellColor} />
                </div>
                <p
                  id="coach-notif-heading"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#F0F0F0',
                    letterSpacing: '0.02em',
                    margin: 0,
                    textAlign: 'center',
                    justifySelf: 'stretch',
                  }}
                >
                  Notificaciones
                </p>
                <div aria-hidden style={{ width: NOTIF_HEADER_SIDE_SLOT_PX }} />
              </div>

              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Bell size={28} strokeWidth={2} color="#E5E7EB" aria-hidden />
                  <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>Todo al día</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.map((notification, index) => (
                    <Link
                      key={notification.id}
                      href="/coach/clients"
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '13px 16px',
                        textDecoration: 'none',
                        backgroundColor: 'transparent',
                        transition: 'background 0.1s',
                        borderBottom:
                          index < notifications.length - 1 ? '1px solid #1A1D22' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          backgroundColor: notification.color,
                          boxShadow:
                            notification.id === 'risk'
                              ? '0 0 0 4px rgba(242,82,82,0.09)'
                              : '0 0 0 4px rgba(242,201,74,0.09)',
                          flexShrink: 0,
                          marginTop: 6,
                          marginLeft: 6,
                        }}
                      />
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: notification.color,
                            lineHeight: 1.35,
                            margin: 0,
                          }}
                        >
                          {notification.mainText}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: NOTIF_SECONDARY_TEXT_COLOR,
                            marginTop: 3,
                            lineHeight: 1.4,
                          }}
                        >
                          {notification.secondaryText}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
                </motion.div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    ) : null

  return (
    <>
      <div style={{ position: 'relative' }}>
        <motion.button
          type="button"
          onClick={() => {
            setOpen((prevOpen) => !prevOpen)
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={
            totalClientsWithNotifications > 0
              ? `${totalClientsWithNotifications} ${
                  totalClientsWithNotifications === 1 ? 'cliente requiere' : 'clientes requieren'
                } atención`
              : 'Notificaciones'
          }
          whileTap={{ scale: 0.88, opacity: 0.7 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: totalClientsWithNotifications > 0 ? '#F0F0F0' : '#E5E7EB',
            padding: 8,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <BellWithCountBadge count={totalClientsWithNotifications} bellColor={bellColor} />
        </motion.button>
      </div>
      {mounted ? createPortal(overlay, document.body) : null}
    </>
  )
}
