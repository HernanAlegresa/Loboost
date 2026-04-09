# Coach Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the coach dashboard screen — greeting, KPI strip with momentum sparkline, scrollable client list with filter tabs, FAB, and bottom navigation.

**Architecture:** Server Component (`page.tsx`) fetches all data in parallel and passes typed props to two client components: `KpiStrip` (3 KPI cards + sparkline) and `ClientList` (filter state + animated card list). UI primitives (Avatar, ComplianceBadge, StatCard, FilterTabs, BottomNav) live in `src/components/ui/`. Data queries are isolated in `queries.ts` next to the page. The layout wraps all coach screens with header + bottom nav.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, framer-motion, lucide-react, Supabase `@supabase/ssr`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Add design tokens via Tailwind v4 `@theme` |
| `src/components/ui/avatar.tsx` | Create | Initials avatar (sm/md/lg), pure component |
| `src/components/ui/compliance-badge.tsx` | Create | Compliance % badge with color thresholds |
| `src/components/ui/stat-card.tsx` | Create | KPI card primitive (label + value) |
| `src/components/ui/filter-tabs.tsx` | Create | Scrollable pill tab bar, client component |
| `src/components/ui/bottom-nav.tsx` | Create | Fixed bottom nav, client component |
| `src/components/ui/__tests__/avatar.test.tsx` | Create | TDD tests for initials extraction + sizing |
| `src/components/ui/__tests__/compliance-badge.test.tsx` | Create | TDD tests for threshold color logic |
| `src/components/ui/__tests__/stat-card.test.tsx` | Create | TDD tests for render + variants |
| `src/app/(coach)/coach/dashboard/queries.ts` | Create | All Supabase queries for the dashboard |
| `src/app/(coach)/coach/dashboard/kpi-strip.tsx` | Create | 3 KPI cards + sparkline, client component |
| `src/app/(coach)/coach/dashboard/client-list.tsx` | Create | Filter state + animated client cards |
| `src/app/(coach)/coach/dashboard/page.tsx` | Modify | Server Component, data fetch, layout shell |
| `src/app/(coach)/layout.tsx` | Modify | New header (Loboost logo, bell), BottomNav |

---

### Task 1: Design tokens + dependencies

**Files:**
- Modify: `src/app/globals.css`
- Run: `npm install framer-motion lucide-react`

- [ ] **Step 1: Install dependencies**

```bash
cd "/c/Users/herna/Loboost App" && npm install framer-motion lucide-react
```

Expected: both packages added to `node_modules`. `package.json` updated.

- [ ] **Step 2: Add design tokens to globals.css**

Replace the entire file:

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #0A0A0A;
  --color-bg-surface: #111317;
  --color-bg-elevated: #1A1D22;
  --color-border-subtle: #1F2227;
  --color-border-default: #2A2D34;
  --color-text-primary: #F0F0F0;
  --color-text-secondary: #6B7280;
  --color-text-disabled: #3D3F45;
  --color-accent: #B5F23D;
  --color-warning: #F2994A;
  --color-error: #F25252;
  --font-sans: Inter, sans-serif;
}

body {
  background-color: #0A0A0A;
  color: #F0F0F0;
  font-family: Inter, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/app/globals.css package.json package-lock.json && git commit -m "feat: add design tokens and install framer-motion + lucide-react"
```

---

### Task 2: Avatar component (TDD)

**Files:**
- Create: `src/components/ui/__tests__/avatar.test.tsx`
- Create: `src/components/ui/avatar.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/avatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import Avatar from '../avatar'

describe('Avatar', () => {
  it('extracts initials from first and last name', () => {
    render(<Avatar fullName="Sofía Torres" />)
    expect(screen.getByText('ST')).toBeInTheDocument()
  })

  it('uses single letter for one-word name', () => {
    render(<Avatar fullName="Hernán" />)
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('returns ? for empty string', () => {
    render(<Avatar fullName="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('extracts first and last of multi-word name', () => {
    render(<Avatar fullName="Juan Carlos Pérez López" />)
    expect(screen.getByText('JL')).toBeInTheDocument()
  })

  it('renders sm size at 28px', () => {
    const { container } = render(<Avatar fullName="AB" size="sm" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('28px')
    expect(el.style.height).toBe('28px')
  })

  it('renders md size at 40px (default)', () => {
    const { container } = render(<Avatar fullName="AB" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })

  it('renders lg size at 52px', () => {
    const { container } = render(<Avatar fullName="AB" size="lg" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('52px')
    expect(el.style.height).toBe('52px')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/avatar.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../avatar'`

- [ ] **Step 3: Implement Avatar**

Create `src/components/ui/avatar.tsx`:

```tsx
type AvatarSize = 'sm' | 'md' | 'lg'

type AvatarProps = {
  fullName: string
  size?: AvatarSize
}

const SIZE_CONFIG: Record<AvatarSize, { px: number; fontSize: number }> = {
  sm: { px: 28, fontSize: 11 },
  md: { px: 40, fontSize: 13 },
  lg: { px: 52, fontSize: 16 },
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ fullName, size = 'md' }: AvatarProps) {
  const { px, fontSize } = SIZE_CONFIG[size]
  return (
    <div
      style={{
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: '50%',
        backgroundColor: '#1A1D22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize, fontWeight: 600, color: '#B5F23D', lineHeight: 1 }}>
        {getInitials(fullName)}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/avatar.test.tsx --no-coverage
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/components/ui/avatar.tsx src/components/ui/__tests__/avatar.test.tsx && git commit -m "feat: add Avatar UI component (TDD)"
```

---

### Task 3: ComplianceBadge component (TDD)

**Files:**
- Create: `src/components/ui/__tests__/compliance-badge.test.tsx`
- Create: `src/components/ui/compliance-badge.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/compliance-badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import ComplianceBadge from '../compliance-badge'

describe('ComplianceBadge', () => {
  it('shows percentage text for numeric value', () => {
    render(<ComplianceBadge value={87} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('shows "Sin plan" for null value', () => {
    render(<ComplianceBadge value={null} />)
    expect(screen.getByText('Sin plan')).toBeInTheDocument()
  })

  it('uses accent green for value >= 70', () => {
    const { container } = render(<ComplianceBadge value={70} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(181, 242, 61)')
  })

  it('uses accent green for value = 70 (boundary)', () => {
    render(<ComplianceBadge value={70} />)
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('uses warning orange for value = 69 (boundary)', () => {
    const { container } = render(<ComplianceBadge value={69} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 153, 74)')
  })

  it('uses warning orange for value 40-69', () => {
    const { container } = render(<ComplianceBadge value={54} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 153, 74)')
  })

  it('uses error red for value = 39 (boundary)', () => {
    const { container } = render(<ComplianceBadge value={39} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 82, 82)')
  })

  it('uses error red for null (no plan)', () => {
    const { container } = render(<ComplianceBadge value={null} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(242, 82, 82)')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/compliance-badge.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../compliance-badge'`

- [ ] **Step 3: Implement ComplianceBadge**

Create `src/components/ui/compliance-badge.tsx`:

```tsx
type ComplianceBadgeProps = {
  value: number | null
}

type BadgeConfig = {
  label: string
  bg: string
  color: string
}

export function getBadgeConfig(value: number | null): BadgeConfig {
  if (value === null) {
    return { label: 'Sin plan', bg: 'rgba(242,82,82,0.12)', color: 'rgb(242, 82, 82)' }
  }
  if (value >= 70) {
    return { label: `${value}%`, bg: 'rgba(181,242,61,0.12)', color: 'rgb(181, 242, 61)' }
  }
  if (value >= 40) {
    return { label: `${value}%`, bg: 'rgba(242,153,74,0.12)', color: 'rgb(242, 153, 74)' }
  }
  return { label: `${value}%`, bg: 'rgba(242,82,82,0.12)', color: 'rgb(242, 82, 82)' }
}

export default function ComplianceBadge({ value }: ComplianceBadgeProps) {
  const { label, bg, color } = getBadgeConfig(value)
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/compliance-badge.test.tsx --no-coverage
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/components/ui/compliance-badge.tsx src/components/ui/__tests__/compliance-badge.test.tsx && git commit -m "feat: add ComplianceBadge UI component (TDD)"
```

---

### Task 4: StatCard component (TDD)

**Files:**
- Create: `src/components/ui/__tests__/stat-card.test.tsx`
- Create: `src/components/ui/stat-card.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/stat-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import StatCard from '../stat-card'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="CLIENTES" value={12} />)
    expect(screen.getByText('CLIENTES')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard label="ACTIVOS" value="8" />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('uses #F0F0F0 as default value color', () => {
    const { getByTestId } = render(<StatCard label="CLIENTES" value={12} />)
    const valueEl = getByTestId('stat-card-value')
    expect(valueEl.style.color).toBe('rgb(240, 240, 240)')
  })

  it('uses provided valueColor', () => {
    const { getByTestId } = render(
      <StatCard label="ACTIVOS" value={8} valueColor="#B5F23D" />
    )
    const valueEl = getByTestId('stat-card-value')
    expect(valueEl.style.color).toBe('rgb(181, 242, 61)')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/stat-card.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../stat-card'`

- [ ] **Step 3: Implement StatCard**

Create `src/components/ui/stat-card.tsx`:

```tsx
type StatCardProps = {
  label: string
  value: string | number
  valueColor?: string
  children?: React.ReactNode
}

export default function StatCard({ label, value, valueColor = '#F0F0F0', children }: StatCardProps) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111317',
        border: '1px solid #1F2227',
        borderRadius: 14,
        padding: '14px 16px',
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {children ?? (
        <p
          data-testid="stat-card-value"
          style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1 }}
        >
          {value}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/c/Users/herna/Loboost App" && npx jest src/components/ui/__tests__/stat-card.test.tsx --no-coverage
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/components/ui/stat-card.tsx src/components/ui/__tests__/stat-card.test.tsx && git commit -m "feat: add StatCard UI component (TDD)"
```

---

### Task 5: FilterTabs component

**Files:**
- Create: `src/components/ui/filter-tabs.tsx`

- [ ] **Step 1: Create FilterTabs**

Create `src/components/ui/filter-tabs.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/components/ui/filter-tabs.tsx && git commit -m "feat: add FilterTabs UI component"
```

---

### Task 6: BottomNav component

**Files:**
- Create: `src/components/ui/bottom-nav.tsx`

- [ ] **Step 1: Create BottomNav**

Create `src/components/ui/bottom-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, BookOpen, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Inicio', href: '/coach/dashboard', Icon: Home },
  { label: 'Clientes', href: '/coach/clients', Icon: Users },
  { label: 'Librería', href: '/coach/library', Icon: BookOpen },
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
        height: 64,
        backgroundColor: '#0A0A0A',
        borderTop: '1px solid #1F2227',
        display: 'flex',
        alignItems: 'center',
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add src/components/ui/bottom-nav.tsx && git commit -m "feat: add BottomNav UI component"
```

---

### Task 7: Dashboard data queries

**Files:**
- Create: `src/app/(coach)/coach/dashboard/queries.ts`

- [ ] **Step 1: Create queries.ts**

Create `src/app/(coach)/coach/dashboard/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'
import { getClientAlerts } from '@/lib/analytics/alerts'
import type { AlertType } from '@/types/domain'

export type DashboardClientSummary = {
  id: string
  fullName: string
  goal: string | null
  daysPerWeek: number
  hasActivePlan: boolean
  lastSessionDate: Date | null
  daysSinceLastSession: number | null
  weeklyCompliance: number
  alerts: AlertType[]
  statusColor: 'active' | 'warning' | 'critical'
}

export type DashboardData = {
  clients: DashboardClientSummary[]
  totalClients: number
  activeClients: number
  momentumPercent: number
  sparklineData: number[]
}

export async function getDashboardData(coachId: string): Promise<DashboardData> {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('coach_id', coachId)
    .eq('role', 'client')

  if (!profiles || profiles.length === 0) {
    return {
      clients: [],
      totalClients: 0,
      activeClients: 0,
      momentumPercent: 0,
      sparklineData: Array(7).fill(0),
    }
  }

  const clientIds = profiles.map((p) => p.id)

  const [clientProfilesResult, activePlansResult, sessionsResult] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('id, goal, days_per_week')
      .in('id', clientIds),
    supabase
      .from('client_plans')
      .select('client_id')
      .in('client_id', clientIds)
      .eq('status', 'active'),
    supabase
      .from('sessions')
      .select('client_id, completed_at')
      .in('client_id', clientIds)
      .eq('status', 'completed')
      .gte(
        'completed_at',
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('completed_at', { ascending: false }),
  ])

  const clientProfilesMap = new Map(
    (clientProfilesResult.data ?? []).map((cp) => [cp.id, cp])
  )
  const activePlanClientIds = new Set(
    (activePlansResult.data ?? []).map((p) => p.client_id)
  )

  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const sevenDaysAgo = now - sevenDaysMs
  const allSessions = sessionsResult.data ?? []

  // Momentum: current week vs previous week session counts (all clients combined)
  const sparklineData: number[] = Array(7).fill(0)
  let currentWeekCount = 0
  let prevWeekCount = 0

  for (const session of allSessions) {
    if (!session.completed_at) continue
    const sessionTime = new Date(session.completed_at).getTime()
    const daysAgo = Math.floor((now - sessionTime) / (1000 * 60 * 60 * 24))
    if (daysAgo < 7) {
      currentWeekCount++
      if (daysAgo >= 0) sparklineData[6 - daysAgo]++
    } else {
      prevWeekCount++
    }
  }

  const momentumPercent =
    prevWeekCount === 0
      ? currentWeekCount > 0 ? 100 : 0
      : Math.round(((currentWeekCount - prevWeekCount) / prevWeekCount) * 100)

  const clients: DashboardClientSummary[] = profiles.map((profile) => {
    const cp = clientProfilesMap.get(profile.id)
    const hasActivePlan = activePlanClientIds.has(profile.id)
    const daysPerWeek = cp?.days_per_week ?? 3

    const clientSessions = allSessions.filter((s) => s.client_id === profile.id)
    const mostRecent = clientSessions[0]
    const lastSessionDate =
      mostRecent?.completed_at ? new Date(mostRecent.completed_at) : null

    const daysSinceLastSession =
      lastSessionDate !== null
        ? Math.floor((now - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

    const completedInLastWeek = clientSessions.filter((s) => {
      if (!s.completed_at) return false
      return new Date(s.completed_at).getTime() >= sevenDaysAgo
    }).length

    const weeklyCompliance = calculateWeeklyCompliance({
      expectedDays: daysPerWeek,
      completedDays: completedInLastWeek,
    })

    const alerts = getClientAlerts({
      lastSessionDate,
      weeklyCompliance,
      hasActivePlan,
    })

    let statusColor: 'active' | 'warning' | 'critical'
    if (!hasActivePlan || (daysSinceLastSession !== null && daysSinceLastSession > 7)) {
      statusColor = 'critical'
    } else if (daysSinceLastSession !== null && daysSinceLastSession > 3) {
      statusColor = 'warning'
    } else {
      statusColor = 'active'
    }

    return {
      id: profile.id,
      fullName: profile.full_name ?? 'Sin nombre',
      goal: cp?.goal ?? null,
      daysPerWeek,
      hasActivePlan,
      lastSessionDate,
      daysSinceLastSession,
      weeklyCompliance,
      alerts,
      statusColor,
    }
  })

  return {
    clients,
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.hasActivePlan).length,
    momentumPercent,
    sparklineData,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add "src/app/(coach)/coach/dashboard/queries.ts" && git commit -m "feat: add dashboard data queries module"
```

---

### Task 8: KpiStrip component

**Files:**
- Create: `src/app/(coach)/coach/dashboard/kpi-strip.tsx`

- [ ] **Step 1: Create KpiStrip**

Create `src/app/(coach)/coach/dashboard/kpi-strip.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import StatCard from '@/components/ui/stat-card'

type KpiStripProps = {
  totalClients: number
  activeClients: number
  momentumPercent: number
  sparklineData: number[]
}

export default function KpiStrip({
  totalClients,
  activeClients,
  momentumPercent,
  sparklineData,
}: KpiStripProps) {
  const maxSessions = Math.max(...sparklineData, 1)
  const trendPositive = momentumPercent >= 0
  const trendLabel =
    momentumPercent === 0
      ? '= igual'
      : trendPositive
      ? `↑ ${momentumPercent}%`
      : `↓ ${Math.abs(momentumPercent)}%`

  return (
    <div style={{ display: 'flex', gap: 12, padding: '0 20px' }}>
      {/* Clientes */}
      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
      >
        <StatCard label="Clientes" value={totalClients} />
      </motion.div>

      {/* Activos */}
      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.04 }}
      >
        <StatCard label="Activos" value={activeClients} valueColor="#B5F23D" />
      </motion.div>

      {/* Momentum / Esta semana */}
      <motion.div
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
      >
        <StatCard label="Esta semana" value="">
          <div>
            {/* Trend badge */}
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: trendPositive ? '#B5F23D' : '#F2994A',
                marginBottom: 6,
              }}
            >
              {trendLabel}
            </p>
            {/* Sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 24 }}>
              {sparklineData.map((count, i) => {
                const height = Math.max(4, Math.round((count / maxSessions) * 24))
                const filled = count > 0
                return (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height,
                      borderRadius: 2,
                      backgroundColor: filled ? '#B5F23D' : '#1A1D22',
                      flex: 1,
                    }}
                  />
                )
              })}
            </div>
          </div>
        </StatCard>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add "src/app/(coach)/coach/dashboard/kpi-strip.tsx" && git commit -m "feat: add KpiStrip component with momentum sparkline"
```

---

### Task 9: ClientList component

**Files:**
- Create: `src/app/(coach)/coach/dashboard/client-list.tsx`

- [ ] **Step 1: Create ClientList**

Create `src/app/(coach)/coach/dashboard/client-list.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Avatar from '@/components/ui/avatar'
import ComplianceBadge from '@/components/ui/compliance-badge'
import FilterTabs from '@/components/ui/filter-tabs'
import type { DashboardClientSummary } from './queries'

type FilterTab = 'Todos' | 'Activos' | 'Pendientes' | 'Inactividad'

const TABS: FilterTab[] = ['Todos', 'Activos', 'Pendientes', 'Inactividad']

const STATUS_COLORS: Record<'active' | 'warning' | 'critical', string> = {
  active: '#B5F23D',
  warning: '#F2994A',
  critical: '#F25252',
}

function getLastActivityLabel(daysSinceLastSession: number | null): string {
  if (daysSinceLastSession === null) return 'Sin actividad'
  if (daysSinceLastSession === 0) return 'hoy'
  if (daysSinceLastSession === 1) return 'hace 1 día'
  return `hace ${daysSinceLastSession} días`
}

type ClientListProps = {
  clients: DashboardClientSummary[]
}

export default function ClientList({ clients }: ClientListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Todos')

  const filtered = clients.filter((client) => {
    switch (activeFilter) {
      case 'Activos':
        return (
          client.hasActivePlan &&
          (client.daysSinceLastSession === null ||
            client.daysSinceLastSession <= 7)
        )
      case 'Pendientes':
        return client.alerts.includes('no_plan')
      case 'Inactividad':
        return (
          client.hasActivePlan &&
          client.daysSinceLastSession !== null &&
          client.daysSinceLastSession > 5
        )
      default:
        return true
    }
  })

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ padding: '16px 20px 8px' }}>
        <FilterTabs
          tabs={TABS}
          activeTab={activeFilter}
          onChange={(tab) => setActiveFilter(tab as FilterTab)}
        />
      </div>

      {/* Client cards */}
      <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', padding: '24px 0' }}>
            No hay clientes en esta categoría.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Link href={`/coach/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      backgroundColor: '#111317',
                      border: '1px solid #1F2227',
                      borderLeft: `3px solid ${STATUS_COLORS[client.statusColor]}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Avatar fullName={client.fullName} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#F0F0F0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.fullName}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.goal ?? 'Sin objetivo'}
                        {' · '}
                        {getLastActivityLabel(client.daysSinceLastSession)}
                      </p>
                    </div>
                    <ComplianceBadge
                      value={client.hasActivePlan ? client.weeklyCompliance : null}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add "src/app/(coach)/coach/dashboard/client-list.tsx" && git commit -m "feat: add ClientList component with filter tabs and animated cards"
```

---

### Task 10: Dashboard page.tsx

**Files:**
- Modify: `src/app/(coach)/coach/dashboard/page.tsx`

- [ ] **Step 1: Replace page.tsx with Server Component**

Replace the entire content of `src/app/(coach)/coach/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from './queries'
import KpiStrip from './kpi-strip'
import ClientList from './client-list'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const [profileResult, dashboardData] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getDashboardData(user.id),
  ])

  const fullName = profileResult.data?.full_name ?? 'Coach'
  const firstName = fullName.split(' ')[0]

  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Greeting */}
      <div
        style={{
          padding: '20px 20px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ fontSize: 16, color: '#F0F0F0' }}>{greeting},</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#F0F0F0', lineHeight: 1.2 }}>
            {firstName}
          </p>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {dateFormatted}
          </p>
        </div>
        {/* Coach avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#1A1D22',
            border: '2px solid #B5F23D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 600, color: '#B5F23D' }}>
            {firstName[0]?.toUpperCase() ?? 'C'}
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip
        totalClients={dashboardData.totalClients}
        activeClients={dashboardData.activeClients}
        momentumPercent={dashboardData.momentumPercent}
        sparklineData={dashboardData.sparklineData}
      />

      {/* Client list with filter tabs */}
      <div style={{ marginTop: 16 }}>
        <ClientList clients={dashboardData.clients} />
      </div>

      {/* Bottom fade overlay — hides cards behind FAB zone */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to bottom, transparent, #0A0A0A)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* FAB */}
      <a
        href="/coach/clients/new"
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: '#B5F23D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(181,242,61,0.25)',
          zIndex: 20,
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>+</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
cd "/c/Users/herna/Loboost App" && npx jest --no-coverage
```

Expected: all existing tests pass (37+11 new UI tests).

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add "src/app/(coach)/coach/dashboard/page.tsx" && git commit -m "feat: implement coach dashboard page (Server Component)"
```

---

### Task 11: Update layout.tsx

**Files:**
- Modify: `src/app/(coach)/layout.tsx`

- [ ] **Step 1: Replace layout with new header + BottomNav**

Replace the entire content of `src/app/(coach)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/bottom-nav'
import { Bell } from 'lucide-react'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#F0F0F0' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#0A0A0A',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#B5F23D' }}>Lobo</span>
          <span style={{ color: '#F0F0F0' }}>ost</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Bell icon — badge hardcoded, will connect to notifications in Phase 4 */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={20} color="#6B7280" />
          </div>
        </div>
      </header>

      {/* Main content — padded below for bottom nav */}
      <main style={{ paddingBottom: 64 }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/c/Users/herna/Loboost App" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd "/c/Users/herna/Loboost App" && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/herna/Loboost App" && git add "src/app/(coach)/layout.tsx" && git commit -m "feat: update coach layout with new header (Loboost logo, bell) and bottom nav"
```
