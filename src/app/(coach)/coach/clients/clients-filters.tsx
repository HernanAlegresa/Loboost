'use client'

import FilterTabs, { type FilterTabItem } from '@/components/ui/filter-tabs'

export type ClientsFilterId = 'todos' | 'en_riesgo' | 'atrasado' | 'al_dia' | 'sin_plan'

const BASE_FILTER_ITEMS: FilterTabItem[] = [
  { id: 'todos', label: 'Todos', activeBackground: '#B5F23D', activeColor: '#0A0A0A' },
  { id: 'en_riesgo', label: 'En riesgo', activeBackground: '#F25252', activeColor: '#F0F0F0' },
  { id: 'atrasado', label: 'Pendiente', activeBackground: '#F2994A', activeColor: '#0A0A0A' },
  { id: 'al_dia', label: 'Al día', activeBackground: '#22C55E', activeColor: '#0A0A0A' },
  { id: 'sin_plan', label: 'Sin plan', activeBackground: '#6B7280', activeColor: '#F0F0F0' },
]

type Props = {
  activeFilter: ClientsFilterId
  onChange: (filter: ClientsFilterId) => void
  counts: Record<ClientsFilterId, number>
}

export default function ClientsFilters({ activeFilter, onChange, counts }: Props) {
  const items = BASE_FILTER_ITEMS.map((item) => {
    const n = item.id === 'todos' ? counts.todos : counts[item.id as ClientsFilterId]
    const label = item.id === activeFilter ? `${item.label} (${n})` : item.label
    return { ...item, label }
  })

  return (
    <FilterTabs
      items={items}
      activeId={activeFilter}
      onChange={(id) => onChange(id as ClientsFilterId)}
    />
  )
}
