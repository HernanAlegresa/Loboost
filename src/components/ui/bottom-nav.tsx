'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, BookOpen, Settings } from 'lucide-react'
import {
  SAFE_BOTTOM_NAV_HEIGHT,
  SAFE_BOTTOM_NAV_PADDING_BOTTOM,
  SAFE_BOTTOM_NAV_PADDING_TOP,
} from '@/lib/ui/safe-area'

const NAV_ITEMS = [
  { label: 'Inicio', href: '/coach/dashboard', Icon: Home },
  { label: 'Clientes', href: '/coach/clients', Icon: Users },
  { label: 'Biblioteca', href: '/coach/library', Icon: BookOpen },
  { label: 'Ajustes', href: '/coach/settings', Icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: SAFE_BOTTOM_NAV_HEIGHT,
        backgroundColor: '#0A0A0A',
        borderTop: '1px solid #1F2227',
        display: 'flex',
        alignItems: 'stretch',
        paddingTop: SAFE_BOTTOM_NAV_PADDING_TOP,
        paddingBottom: SAFE_BOTTOM_NAV_PADDING_BOTTOM,
        boxSizing: 'border-box',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map(({ label, href, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              textDecoration: 'none',
              color: isActive ? '#B5F23D' : '#6B7280',
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
