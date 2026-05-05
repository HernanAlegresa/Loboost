'use client'

import type { ReactNode } from 'react'
import FilterTabs, { type FilterTabItem } from '@/components/ui/filter-tabs'

export type ClientsFilterId = 'todos' | 'en_riesgo' | 'atrasado' | 'al_dia' | 'sin_plan'

const BASE_FILTER_ITEMS: FilterTabItem[] = [
  { id: 'todos', label: 'Todos', activeBackground: '#B5F23D', activeColor: '#0A0A0A' },
  { id: 'en_riesgo', label: 'En riesgo', activeBackground: '#F25252', activeColor: '#0A0A0A' },
  { id: 'atrasado', label: 'Pendiente', activeBackground: '#F2994A', activeColor: '#0A0A0A' },
  { id: 'al_dia', label: 'Al día', activeBackground: '#22C55E', activeColor: '#0A0A0A' },
  { id: 'sin_plan', label: 'Sin plan', activeBackground: '#6B7280', activeColor: '#0A0A0A' },
]

type Props = {
  activeFilter: ClientsFilterId
  onChange: (filter: ClientsFilterId) => void
  counts: Record<ClientsFilterId, number>
}

export default function ClientsFilters({ activeFilter, onChange, counts }: Props) {
  const items = BASE_FILTER_ITEMS.map((item) => {
    const n = item.id === 'todos' ? counts.todos : counts[item.id as ClientsFilterId]
    const shouldShowCount = item.id === activeFilter && n > 0
    const label: ReactNode = shouldShowCount ? (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
        <span>{item.label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.01em' }}>({n})</span>
      </span>
    ) : (
      item.label
    )
    return { ...item, label }
  })

  return (
    <FilterTabs
      items={items}
      activeId={activeFilter}
      onChange={(id) => onChange(id as ClientsFilterId)}
      inactiveBackground="rgba(75, 85, 99, 0.34)"
      inactiveColor="rgba(218, 224, 233, 0.72)"
      inactiveBorder="transparent"
    />
  )
}
