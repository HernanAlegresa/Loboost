'use client'

type FilterTabsProps = {
  tabs: string[]
  activeTab: string
  onChange: (tab: string) => void
}

export default function FilterTabs({ tabs, activeTab, onChange }: FilterTabsProps) {
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
      {tabs.map((tab) => {
        const isActive = tab === activeTab
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#0A0A0A' : '#6B7280',
              backgroundColor: isActive ? '#B5F23D' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
