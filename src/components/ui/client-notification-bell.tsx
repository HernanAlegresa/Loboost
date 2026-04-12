'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import type { WeekStripDay } from '@/features/training/types'

type NotificationItem = {
  id: string
  title: string
  description: string
  href: string
}

type Props = {
  inProgressSession: { sessionId: string } | null
  weekStrip: WeekStripDay[] | null
}

export default function ClientNotificationBell({ inProgressSession, weekStrip }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Use device local date to handle UTC/timezone correctly
  const todayISO = new Date().toLocaleDateString('en-CA')

  const notifications: NotificationItem[] = []

  if (inProgressSession) {
    notifications.push({
      id: 'in_progress',
      title: 'Sesión sin completar',
      description: 'Terminá de registrar los datos de tu última sesión.',
      href: `/client/training/${inProgressSession.sessionId}`,
    })
  }

  if (weekStrip) {
    const missedDays = weekStrip.filter(
      (d) =>
        d.status === 'past_missed' &&
        d.dateISO !== undefined &&
        d.dateISO < todayISO
    )
    if (missedDays.length > 0) {
      notifications.push({
        id: 'missed_days',
        title: missedDays.length === 1
          ? '1 día sin registrar esta semana'
          : `${missedDays.length} días sin registrar esta semana`,
        description: 'Tocá el ○ en "Esta semana" en el inicio para registrar.',
        href: '/client/dashboard',
      })
    }
  }

  const count = notifications.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          background: open ? 'rgba(255,255,255,0.06)' : 'none',
          border: 'none',
          cursor: 'pointer',
          color: count > 0 ? '#F0F0F0' : '#6B7280',
          padding: 8,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
      >
        <Bell size={20} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              backgroundColor: '#F2994A',
              borderRadius: '50%',
              border: '1.5px solid #0A0A0A',
            }}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 'min(300px, calc(100vw - 40px))',
            backgroundColor: '#111317',
            border: '1px solid #2A2D34',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {/* Caret arrow */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: 14,
              width: 12,
              height: 12,
              backgroundColor: '#111317',
              border: '1px solid #2A2D34',
              borderRight: 'none',
              borderBottom: 'none',
              transform: 'rotate(45deg)',
            }}
          />

          {/* Header */}
          <div
            style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid #1F2227',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F0', letterSpacing: '0.02em' }}>
              Notificaciones
            </p>
            {count > 0 && (
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {count === 1 ? '1 pendiente' : `${count} pendientes`}
              </p>
            )}
          </div>

          {/* Items */}
          {count === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>🔔</p>
              <p style={{ fontSize: 13, color: '#4B5563' }}>Todo al día</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((n, i) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '13px 16px',
                    borderBottom: i < notifications.length - 1 ? '1px solid #1A1D22' : 'none',
                    textDecoration: 'none',
                    backgroundColor: 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#F2994A',
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.35 }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>
                      {n.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
