# Coach Dashboard — Design Spec

> **Phase 3 — Screen 1 of N**
> Feature: Coach dashboard (client roster overview + alert triage)

---

## Goal

Single-screen command center for the coach. From here they see the health of their full client roster, triage alerts, and navigate to any client. Fast, scannable, zero friction.

---

## Route & Context

- Route: `/coach/dashboard` (existing placeholder)
- Layout wrapper: `src/app/(coach)/layout.tsx` — already renders the global header (logo + sign-out)
- Data source: Supabase via Server Component + server actions from Fase 2 backend
- Auth: coach is already authenticated (middleware-protected route group)

---

## Architecture

**Server Component** (`page.tsx`) fetches all data at render time — no loading states needed for the initial view. Data shape is small (single coach's client list, never more than a few hundred rows). No client-side fetching required for the initial render.

Single page, three logical sections stacked vertically:

```
[Layout Header — already exists]
[1] Greeting + date
[2] KPI Strip
[3] Alert Banner (conditional — hidden when 0 alerts)
[4] Filter Tabs
[5] Client List
[6] FAB (fixed, bottom-right)
```

---

## Data Requirements

The page fetches in parallel:

| Query | Purpose |
|---|---|
| `supabase.auth.getUser()` | Coach name for greeting |
| `client_profiles` JOIN `client_plans(status=active)` | Client roster with plan status |
| `sessions` (last 7 days) | Activity for "active this week" KPI |
| `getClientAlerts(...)` per client | Alert types per client |

`getClientAlerts` and `getExerciseProgress` already exist in `src/lib/analytics/`. The page uses them directly.

---

## Section 1 — Greeting

```
Buenos días, Hernán       ← dynamic greeting (mañana/tarde/noche based on hour)
Miércoles, 9 de abril     ← full date, locale es-AR
```

- Typography: greeting = `display` (24px 700), date = `caption` (12px 400) `text-secondary`
- No border, no card — floats above the content strip
- Padding top: 24px, bottom: 20px

---

## Section 2 — KPI Strip

Three stat cards in a horizontal row, equal width, `gap-3`.

| Stat | Value | Label |
|---|---|---|
| Total clientes | count of all clients | "clientes" |
| Activos esta semana | count with session in last 7 days | "activos" |
| Alertas | count of clients with ≥1 alert | "alertas" |

**Alert stat card variant:** When alerts > 0, the value renders in `#F2994A` (warning) instead of `text-primary`. Otherwise renders normally.

Card anatomy (Stat Card from DESIGN.md):
```
bg: #111317 | border: 1px solid #1F2227 | radius: 14px | padding: 14px 16px
value: 28px 700 text-primary
label: 11px 600 text-secondary uppercase letter-spacing (overline scale)
```

---

## Section 3 — Alert Banner (conditional)

Shown only when at least one client has an alert. Hidden entirely when alerts = 0.

**Header row:**
```
⚠  Clientes que necesitan atención     [N alertas]
```
- Left icon: `#F2994A` warning color
- Label: `body` 15px 600 `text-primary`
- Right badge: `warning-dim` bg, `#F2994A` text, `caption` 12px 600, `radius: full`, `padding: 3px 8px`

**Alert rows** (one per client with alert, max 3 shown, "+N más" if overflow):
```
[Avatar]  [Name]                    [Alert badge]
          Last session: hace 6 días
```
- Avatar: 28px (sm), initials from fullName, `bg: #1A1D22`, `text: #B5F23D`
- Name: `label` 13px 500 `text-primary`
- Last session line: `caption` 12px `text-secondary`
- Alert badge variants:
  - `inactive` → "Sin actividad" · `warning-dim` bg · `#F2994A` text
  - `low_compliance` → "Bajo cumplimiento" · `warning-dim` bg · `#F2994A` text  
  - `no_plan` → "Sin plan" · `error-dim` bg · `#F25252` text
- Entire row is tappable → navigates to `/coach/clients/[id]`
- Left border accent: `3px solid #F2994A` (Alert Card variant from DESIGN.md)

Container: card with `border-left: 3px solid #F2994A`, `padding: 14px 16px`, `gap-3` between rows.

---

## Section 4 — Filter Tabs

Three tabs: **Todos** / **Activos** / **Sin plan**

Filter logic (client-side state, `useState`):
- `Todos` — all clients
- `Activos` — clients with `status: active` plan
- `Sin plan` — clients with no active plan

Tab anatomy (Filter Tab from DESIGN.md):
- Active: `bg: #B5F23D` | `text: #0A0A0A 600` | `radius: full` | `padding: 6px 14px`
- Inactive: `bg: transparent` | `text: #6B7280` | same radius/padding

Tabs row: `flex flex-row gap-2`, scroll horizontally on overflow (rare, 3 tabs always fit).

---

## Section 5 — Client List

One card per client, vertically stacked, `gap-3`. Each card is fully tappable → `/coach/clients/[id]`.

**Client Card anatomy:**
```
[Status dot]  [Avatar md]  [Name · Goal]          [Compliance badge]
                           [Last activity caption]
```

Detailed layout:
```
┌─────────────────────────────────────────────────────┐
│ ● [AV]  Sofía Torres          [87%]                │
│         Pérdida de peso  ·  hace 2 días             │
└─────────────────────────────────────────────────────┘
```

- **Status dot** (4px circle, absolute left of avatar):
  - Green `#B5F23D` — session in last 3 days
  - Orange `#F2994A` — last session 4-7 days ago
  - Gray `#3D3F45` — no session or >7 days
- **Avatar (md):** 40px circle, `bg: #1A1D22`, initials `#B5F23D semibold`
- **Name:** `label` 13px 500 `text-primary`
- **Goal:** `caption` 12px `text-secondary` — inline after `·` separator
- **Last activity:** `caption` 12px `text-secondary` — "hace N días" / "hoy" / "Sin actividad"
- **Compliance badge:** from DESIGN.md badge spec — ≥70% accent, 40-69% warning, <40% error. Shows percentage. Hidden if no active plan (replaced by "Sin plan" badge using `error-dim`).
- Card: `bg: #111317 | border: 1px solid #1F2227 | radius: 14px | padding: 14px 16px`

**Empty state** (when filter shows 0 clients):
```
No hay clientes en esta categoría.
```
Centered, `caption` `text-secondary`.

**Zero clients total** (brand new coach):
```
[plus icon]
Agregá tu primer cliente
[Button Primary: "+ Nuevo cliente"]
```
Centered vertically in remaining space.

---

## Section 6 — FAB (Floating Action Button)

Fixed position, bottom-right corner. Opens new client creation flow.

```
[+]
```
- `bg: #B5F23D` | `text: #0A0A0A` | `width/height: 56px` | `radius: full`
- `position: fixed; bottom: 24px; right: 20px`
- `shadow: 0 4px 16px rgba(181,242,61,0.25)` — subtle lime glow
- Hover: `scale(1.05)` 150ms
- On tap: navigate to `/coach/clients/new` (or open sheet — TBD in next screen spec)

---

## Animations

Using `framer-motion` (Fase 3 install):

| Element | Animation |
|---|---|
| Page enter | opacity 0→1, 150ms ease |
| KPI cards | opacity 0→1 + translateY 6px→0, 200ms, stagger 40ms |
| Client cards | opacity 0→1 + translateY 6px→0, 200ms, stagger 40ms per card |
| Tab switch | opacity transition 150ms on list |
| FAB | scale(1.05) on hover, 150ms |

---

## Mobile Layout

Primary target: 390px (iPhone 14).

- Page padding: `px-5` mobile, `px-6` desktop
- KPI strip: 3 columns `grid-cols-3`, each card equal width
- Client list: single column, full width cards
- Alert banner: full width, max 3 clients shown
- FAB: fixed, always visible above scroll

Desktop (md+): max-width container centered, layout stays single-column (this is a mobile-first dashboard, not a data grid).

---

## Component Files

| File | Responsibility |
|---|---|
| `src/app/(coach)/coach/dashboard/page.tsx` | Server Component, data fetching, layout |
| `src/app/(coach)/coach/dashboard/client-list.tsx` | `'use client'` — filter state + client cards render |
| `src/components/ui/stat-card.tsx` | KPI stat card primitive |
| `src/components/ui/avatar.tsx` | Initials avatar (sm/md/lg) |
| `src/components/ui/compliance-badge.tsx` | Compliance % badge |
| `src/components/ui/alert-card.tsx` | Left-accent alert card wrapper |

---

## Testing

- `stat-card.test.tsx` — renders value + label, warning color variant when alerts > 0
- `compliance-badge.test.tsx` — accent/warning/error thresholds (70%, 69%, 40%)
- `avatar.test.tsx` — initials extraction (first+last name, single name, empty)
- No e2e for this screen in Phase 3 (defer to Playwright phase)

---

## Non-goals (deferred)

- Search/filter by name (Phase 4)
- Sort by last activity / compliance (Phase 4)
- Bulk actions (Phase 4)
- Push notifications (Phase 5)
- Pull-to-refresh (Phase 4)
