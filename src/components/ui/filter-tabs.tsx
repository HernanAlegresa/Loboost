'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export type FilterTabItem = {
  id: string
  label: ReactNode
  /** Background when this tab is selected */
  activeBackground: string
  /** Text color when selected */
  activeColor: string
}

type FilterTabsProps = {
  items: FilterTabItem[]
  activeId: string
  onChange: (id: string) => void
  inactiveBackground?: string
  inactiveColor?: string
  inactiveBorder?: string
}

export default function FilterTabs({
  items,
  activeId,
  onChange,
  inactiveBackground = 'transparent',
  inactiveColor = '#9CA3AF',
  inactiveBorder = 'rgba(107, 114, 128, 0.28)',
}: FilterTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.1 }}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? item.activeColor : inactiveColor,
              backgroundColor: isActive ? item.activeBackground : inactiveBackground,
              border: isActive ? '1px solid transparent' : `1px solid ${inactiveBorder}`,
              cursor: 'pointer',
              transition:
                'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
              boxShadow: isActive ? `0 0 0 1px ${item.activeBackground}40` : 'none',
            }}
          >
            {item.label}
          </motion.button>
        )
      })}
    </div>
  )
}
