'use client'

export type FilterTabItem = {
  id: string
  label: string
  /** Background when this tab is selected */
  activeBackground: string
  /** Text color when selected */
  activeColor: string
}

type FilterTabsProps = {
  items: FilterTabItem[]
  activeId: string
  onChange: (id: string) => void
}

export default function FilterTabs({ items, activeId, onChange }: FilterTabsProps) {
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
        const inactiveText = '#9CA3AF'
        const inactiveBorder = 'rgba(107, 114, 128, 0.28)'
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? item.activeColor : inactiveText,
              backgroundColor: isActive ? item.activeBackground : 'transparent',
              border: isActive ? '1px solid transparent' : `1px solid ${inactiveBorder}`,
              cursor: 'pointer',
              transition:
                'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
              boxShadow: isActive ? `0 0 0 1px ${item.activeBackground}40` : 'none',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
