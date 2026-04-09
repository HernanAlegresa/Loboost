# Coach Dashboard — Design Spec (Final)

> **Phase 3 — Screen 1**
> Route: `/coach/dashboard`

---

## Goal

Single-screen command center for the coach. See the full client roster at a glance, triage who needs attention, and navigate fast. Mobile-first, data-dense, premium dark aesthetic.

---

## Route & Context

- Route: `/coach/dashboard` (existing placeholder at `src/app/(coach)/coach/dashboard/page.tsx`)
- Layout: `src/app/(coach)/layout.tsx` — global header already rendered, will be replaced by new header
- Auth: coach authenticated via middleware
- Data: Supabase Server Component + analytics functions from `src/lib/analytics/`

---

## Architecture

**Server Component** (`page.tsx`) fetches all data at render time. Client list + filter state lives in a `'use client'` child component. No loading states needed for initial render.

```
[Header]
[Greeting + Coach Photo]
[KPI Strip — 3 cards]
[Filter Tabs — 4, scrollable]
[Client List — cards with fade at bottom]
[FAB — fixed]
[Bottom Nav — fixed]
```

---

## Data Fetching (page.tsx — Server Component)

Parallel fetches:
- `supabase.auth.getUser()` → coach name + id
- `client_profiles` JOIN `client_plans(status=active)` → full roster
- `sessions` last 7 days (current week) + last 7 days prior week → momentum %
- `getClientAlerts()` per client → alert type array

---

## Section 1 — Header

Background: `#0A0A0A`, no border, padding `16px 20px`.

**Logo:** "**Lobo**" in `#B5F23D` bold 700 18px + "**ost**" in `#F0F0F0` bold 700 18px. No space. One word: `Loboost`.

**Right icons (left to right):**
- Search icon `#6B7280` 20px — placeholder tap target, search deferred to Phase 4
- Bell icon `#6B7280` 20px — orange dot badge `8px #F2994A` when unread notifications exist

---

## Section 2 — Greeting

Padding: `20px 20px 16px`. Two-column layout: text left, coach photo right.

**Left:**
- "Buenos días," — 16px 400 `#F0F0F0`
- "**Hernán**" — 24px 700 `#F0F0F0`, line below
- "MIÉRCOLES, 9 DE ABRIL" — 11px 600 `#6B7280` uppercase letter-spacing

**Right:**
- Coach profile photo: 56px circle, `border: 2px solid #B5F23D`
- Phase 3: static placeholder image or initials fallback (`bg: #1A1D22`, initials `#B5F23D` semibold)
- Phase 4: real photo from Supabase Storage

---

## Section 3 — KPI Strip

Three equal-width cards in a row. Gap: `12px`. Padding: `0 20px`.

Card base: `bg: #111317 | border: 1px solid #1F2227 | radius: 14px | padding: 14px 16px`

**Card 1 — Clientes:**
- Label: "CLIENTES" — 11px 600 `#6B7280` uppercase
- Value: total client count — 28px 700 `#F0F0F0`

**Card 2 — Activos:**
- Label: "ACTIVOS" — same style
- Value: clients with active plan — 28px 700 `#B5F23D` (lime, active deserves the accent)

**Card 3 — Semana (Momentum):**
- Label: "SEMANA" — same style
- Trend badge: "↑ 23%" or "↓ 5%" — 11px 500, green if positive `#B5F23D`, orange if negative `#F2994A`
- Sparkline: 7 vertical bars (Mon–Sun), `3px wide`, `4px gap`
  - Bar filled: `#B5F23D` if sessions that day > 0
  - Bar empty: `#1A1D22`
  - Heights proportional to session count that day (min 4px, max 24px)
- Calculation: `Math.round(((currentWeekSessions - prevWeekSessions) / prevWeekSessions) * 100)`

---

## Section 4 — Filter Tabs

Padding: `16px 20px 8px`. Horizontal scroll row, `gap: 8px`, no visible scrollbar.

Four tabs: **Todos** / **Activos** / **Pendientes** / **Inactividad**

- Active: `bg: #B5F23D | text: #0A0A0A 600 | radius: 999px | padding: 6px 14px | font: 13px`
- Inactive: `bg: transparent | text: #6B7280 | same radius/padding`

Filter logic (client-side `useState`):
- `Todos` — all clients
- `Activos` — clients with `status: active` plan AND session in last 7 days
- `Pendientes` — clients where coach has a pending action (no plan assigned, unread alert)
- `Inactividad` — clients with active plan but no session in last 7 days

---

## Section 5 — Client List

Padding: `0 20px`. Gap: `12px`. Vertically scrollable. Each card tappable → `/coach/clients/[id]`.

### Bottom Fade Effect

A fixed gradient overlay sits above the list at the bottom, covering the FAB zone:
```css
background: linear-gradient(to bottom, transparent, #0A0A0A);
height: 120px;
position: fixed;
bottom: 64px; /* above bottom nav */
left: 0; right: 0;
pointer-events: none;
```
This ensures the FAB always floats cleanly above content. Cards that scroll into this zone appear to fade out.

### Client Card

```
bg: #111317
border: 1px solid #1F2227
border-left: 3px solid [status-color]
border-radius: 14px
padding: 14px 16px
```

**Left status border color:**
- `#B5F23D` — session in last 3 days (active)
- `#F2994A` — last session 4–7 days ago (warning)
- `#F25252` — no session >7 days OR no plan OR alert (critical)

**Card layout — single row, vertically centered:**

```
[Avatar 40px]  [Name · Info]           [Compliance]
               [Goal · Last activity]
```

- **Avatar:** 40px circle, `bg: #1A1D22`, initials `#B5F23D` semibold 13px
  - Initials: first letter of first name + first letter of last name (e.g. "Sofía Torres" → "ST")
  - Phase 4: replaced by actual photo if uploaded
- **Name:** 13px 500 `#F0F0F0`
- **Goal + activity:** 12px `#6B7280` — "Pérdida de peso · hoy" / "hace N días" / "Sin actividad"
- **Compliance badge:** right-aligned, rounded pill, 12px 600, padding `3px 8px`
  - ≥70%: `bg: rgba(181,242,61,0.12)` text `#B5F23D`
  - 40–69%: `bg: rgba(242,153,74,0.12)` text `#F2994A`
  - <40%: `bg: rgba(242,82,82,0.12)` text `#F25252`
  - No plan: `bg: rgba(242,82,82,0.12)` text `#F25252` label "Sin plan"

**Empty state per filter:**
```
No hay clientes en esta categoría.
```
Centered, `caption` `#6B7280`.

**Zero clients total:**
```
[plus icon]
Agregá tu primer cliente
[Button Primary: "+ Nuevo cliente"]
```

---

## Section 6 — FAB

Fixed, bottom-right. Position: `bottom: 80px` (above bottom nav), `right: 20px`.

```
width: 56px
height: 56px
border-radius: 16px  ← rounded rectangle, not circle
bg: #B5F23D
icon: "+" #0A0A0A bold 24px
box-shadow: 0 4px 16px rgba(181,242,61,0.25)
```

Tap action: navigate to `/coach/clients/new` (create client — most contextual action from dashboard).
Hover/press: `scale(1.05)` 150ms.

---

## Section 7 — Bottom Navigation

Fixed at bottom. `bg: #0A0A0A | border-top: 1px solid #1F2227 | padding: 12px 0 | height: 64px`

Four tabs: **Inicio** / **Clientes** / **Librería** / **Ajustes**

Icons (outline, 22px): house / people / book-open / gear

- Active (Inicio on this screen): icon + label `#B5F23D`, 10px 500 + lime underline dot indicator
- Inactive: icon + label `#6B7280`, 10px

---

## Animations (framer-motion)

| Element | Animation |
|---|---|
| Page enter | opacity 0→1, 150ms ease |
| KPI cards | opacity 0→1 + translateY 6px→0, 200ms, stagger 40ms |
| Client cards | opacity 0→1 + translateY 6px→0, 200ms, stagger 40ms per card |
| Tab switch | opacity 150ms on list re-render |
| FAB | scale(1.05) on hover/press, 150ms |

Install: `npm install framer-motion`

---

## Component Files

| File | Type | Responsibility |
|---|---|---|
| `src/app/(coach)/coach/dashboard/page.tsx` | Server Component | Data fetching, layout shell |
| `src/app/(coach)/coach/dashboard/client-list.tsx` | Client Component | Filter state + card render |
| `src/app/(coach)/coach/dashboard/kpi-strip.tsx` | Client Component | 3 KPI cards + sparkline |
| `src/components/ui/stat-card.tsx` | UI primitive | KPI card |
| `src/components/ui/avatar.tsx` | UI primitive | Initials avatar (sm/md/lg) |
| `src/components/ui/compliance-badge.tsx` | UI primitive | % badge with color thresholds |
| `src/components/ui/bottom-nav.tsx` | UI primitive | Fixed bottom navigation |
| `src/components/ui/filter-tabs.tsx` | UI primitive | Scrollable pill tabs |

---

## Testing

- `avatar.test.tsx` — initials extraction: "Sofía Torres" → "ST", single name → "S", empty → "?"
- `compliance-badge.test.tsx` — color thresholds: 70 → accent, 69 → warning, 40 → warning, 39 → error, no plan → error
- `stat-card.test.tsx` — renders value + label, accent variant for Activos card
- `kpi-strip.test.tsx` — momentum % calculation: positive/negative/zero/no prior week data

---

## Deferred to Phase 4

- Coach profile photo (Supabase Storage upload)
- Client photos (upload + fallback)
- Global search (clients + exercises + plans)
- Advanced filters panel
- Notifications system (bell backend)
- Sort by last activity / compliance
