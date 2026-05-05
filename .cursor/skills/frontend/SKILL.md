---
name: frontend
description: UI implementation protocol for LoBoost — enforces design system, layout invariants, component architecture, and state completeness. Use before creating any new component, page, or major UI section.
---

# Frontend — UI Implementation Protocol

## When to use

- Creating a new component (shared or feature-level)
- Creating a new page or major UI section
- Redesigning an existing screen

**Do NOT invoke** for single-line style fixes, copy changes, or logic-only changes that don't touch the UI.

**Prerequisite:** This skill runs within an approved slice. If no slice context exists, invoke `grill-me` first.

## Agent behavior constraints

These are hard rules — not guidelines, not preferences:

- The design system is the authority. Do not propose alternative color, radius, or spacing choices.
- Do not invent new UI patterns. If a pattern doesn't exist in this skill or in DESIGN.md, escalate.
- If an existing component already covers the need: extend it. Never duplicate.
- If a file you touch has anti-patterns from Step 3: fix them in that file as part of the slice. Scope stays contained — do not expand to other files.

**No improvising on undefined design decisions:**
- Every visual decision (layout, empty state design, icon choice, interaction pattern, error copy) must have been defined in the `grill-me` output for this slice.
- If a decision is missing: stop, ask one specific question, wait for the answer. Do not fill in the blank with a default or a preference.
- "I'll assume X" is not acceptable for any UI decision. Unresolved design uncertainty is a blocker — not permission to improvise.
- When uncertain, ask: "The grill-me didn't specify [X]. Should I use [concrete option A] or [concrete option B]?" — not an open-ended question.

---

## Step 1 — Consistency audit (before writing any code)

Search for existing components that match what you are about to build:

```bash
# Find by name
grep -r "ComponentName" src/components src/features --include="*.tsx" -l

# Find loading/skeleton patterns already in use
grep -r "skeleton\|Skeleton\|loading\|Loading" src/components --include="*.tsx" -l

# Find empty state patterns
grep -r "empty\|Empty\|vacío\|sin " src/components src/features --include="*.tsx" -l
```

Decision rules:
- Same purpose already exists → extend it, stop here
- Similar visual pattern already exists → reuse it
- Truly new → proceed; only add to `src/components/ui/` if used by 2+ features

---

## Step 2 — Layout invariants (non-negotiable)

Every page shell MUST have:

1. **Fixed header** — never scrolls with content
2. **Fixed bottom nav** — never scrolls with content
3. **Safe-area inset** on every fixed element — required for PWA installed to home screen (notch, Dynamic Island, home indicator)

```tsx
import {
  SAFE_AREA_TOP,
  SAFE_AREA_BOTTOM,
  SAFE_HEADER_PADDING_TOP,
  SAFE_BOTTOM_NAV_HEIGHT,
  SAFE_BOTTOM_NAV_PADDING_BOTTOM,
  COACH_LIST_SCROLL_END_ABOVE_NAV,
} from '@/lib/ui/safe-area'
```

Apply to layouts:
- Header: `paddingTop: SAFE_HEADER_PADDING_TOP`
- Bottom nav: `paddingBottom: SAFE_BOTTOM_NAV_PADDING_BOTTOM`, fixed height `SAFE_BOTTOM_NAV_HEIGHT`
- Scrollable content: `paddingBottom: COACH_LIST_SCROLL_END_ABOVE_NAV` (or client equivalent) so content is never hidden behind the nav

Never add a new layout without both the header and bottom nav. Never omit safe-area from a fixed element.

---

## Step 3 — Design system enforcement

### Colors — tokens only

The tokens are defined in `src/app/globals.css` under `@theme` and exposed as Tailwind utilities and CSS variables:

| Token | Tailwind class | CSS var | Use |
|-------|---------------|---------|-----|
| bg-base | `bg-bg-base` | `var(--color-bg-base)` | page background |
| bg-surface | `bg-bg-surface` | `var(--color-bg-surface)` | cards, panels |
| bg-elevated | `bg-bg-elevated` | `var(--color-bg-elevated)` | modals, dropdowns, avatars |
| border-subtle | `border-border-subtle` | `var(--color-border-subtle)` | card borders |
| border-default | `border-border-default` | `var(--color-border-default)` | input borders |
| text-primary | `text-text-primary` | `var(--color-text-primary)` | titles, body |
| text-secondary | `text-text-secondary` | `var(--color-text-secondary)` | labels, metadata |
| text-disabled | `text-text-disabled` | `var(--color-text-disabled)` | disabled states |
| accent | `text-accent` / `bg-accent` | `var(--color-accent)` | CTA, active, progress |
| accent-dim | `bg-accent-dim` | `var(--color-accent-dim)` | accent badge background |
| warning | `text-warning` / `bg-warning` | `var(--color-warning)` | alerts |
| warning-dim | `bg-warning-dim` | `var(--color-warning-dim)` | warning badge background |
| error | `text-error` / `bg-error` | `var(--color-error)` | errors |
| error-dim | `bg-error-dim` | `var(--color-error-dim)` | error badge background |

**PROHIBITED — absolute hard stop:**
```tsx
// ❌ Never — hex colors
style={{ color: '#B5F23D' }}
style={{ backgroundColor: '#111317' }}

// ❌ Never — rgba hardcoded
style={{ backgroundColor: 'rgba(181, 242, 61, 0.35)' }}

// ✅ Always
className="text-accent bg-bg-surface"
style={{ color: 'var(--color-accent)' }}  // only when Tailwind can't express it
```

Accent rule: `accent` must appear in less than 10% of visible screen area. It signals energy — overuse kills the effect.

### Styling — Tailwind only, never inline style

**PROHIBITED:**
```tsx
// ❌ Never
style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '14px 16px' }}
```

**Required:**
```tsx
// ✅ Always
className="flex flex-col gap-4 px-4 py-3"
```

`style={{}}` is allowed ONLY for values that cannot be expressed in Tailwind: safe-area constants, truly dynamic numeric values computed from JS.

### Spacing — 4px grid only

Allowed values (Tailwind scale): `1 / 2 / 3 / 4 / 5 / 6 / 8 / 12 / 16` (= 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64px)

Page padding: `px-5` mobile, `px-6` desktop. Card gap: `gap-3`.

**PROHIBITED:** `gap-[7px]`, `py-[14px]`, `p-[28px]`, Tailwind values 7 / 9 / 11 / 13 / 14 / 18, or any arbitrary value off the 4px grid.

### Typography — defined scale only

| Pattern | Size | Weight | Use |
|---------|------|--------|-----|
| `text-2xl font-bold` | 24px | 700 | display — page title |
| `text-lg font-semibold` | 18px | 600 | heading — section title |
| `text-base` | 16px | 400 | body-lg |
| `text-[15px]` | 15px | 400 | body — card content |
| `text-[13px] font-medium` | 13px | 500 | label — names, tags |
| `text-xs` | 12px | 400 | caption — dates, metadata |
| `text-[11px] font-semibold uppercase tracking-wider` | 11px | 600 | overline — section headers |

**PROHIBITED:** `text-[10px]`, `text-[17px]`, `text-[26px]`, `text-[36px]`, or any size not in the table above.

### Border radius — defined scale only

| Tailwind | Value | Use |
|----------|-------|-----|
| `rounded-[6px]` | 6px | badges, pills |
| `rounded-[10px]` | 10px | buttons, inputs |
| `rounded-[14px]` | 14px | cards |
| `rounded-[20px]` | 20px | modals, sheets |
| `rounded-full` | 9999px | avatars, FAB, tab pills |

**PROHIBITED:** `rounded` (4px), `rounded-md` (6px — use `rounded-[6px]` instead for explicitness), `rounded-lg` (8px), `rounded-xl` (12px), or any radius not in the scale.

### shadcn/ui usage

Use shadcn/ui for structural and accessibility logic (Dialog, DropdownMenu, Sheet, etc.). Always override visual styles — never ship shadcn defaults.

```tsx
// ✅ Correct
<DialogContent className="bg-bg-surface border-border-subtle rounded-[20px] p-6">

// ❌ Wrong — shadcn default styles untouched
<DialogContent>
```

---

## Step 4 — Component architecture

**Placement:**
- Feature-specific → `src/features/[feature]/components/`
- Used by 2+ features → `src/components/ui/`
- Never create a shared component for a single use

**Server vs Client:**
- Default: Server Component — data fetching, static rendering
- Add `'use client'` only when the component requires: event handlers, `useState`, `useEffect`, or browser APIs
- Pass Server Components as `children` props into Client Components — never import a Server Component from inside a Client Component

**Props:**
- Always define a typed `Props` interface — no inline type in the function signature
- No prop drilling past 2 levels — restructure with composition instead

**Extract when you see repetition:**
- If the same visual structure appears twice during a single slice (same layout, same class pattern, same purpose) — extract it into a named component before finishing.
- Two instances within the current slice is the trigger. Do not wait for a third.
- Name it after what it represents, not where it's used: `StatCard`, not `DashboardTopCard`.

**Refactor while in scope:**
- If a file you are modifying has prohibited patterns (hardcoded hex, inline styles, wrong spacing), fix them in that file. Document the fixes in the output block. Do not expand scope to other files.

---

## Step 5 — State completeness (mandatory)

Every UI surface that renders data must implement all three states before the slice is complete:

| State | Required pattern |
|-------|----------------|
| **Loading** | Skeleton UI matching the content shape — not a generic spinner (use spinner only for mutations in progress) |
| **Empty** | Icon + message + action. Never leave a blank space. |
| **Error** | Error message + recovery action (retry or fallback navigation) |

No state may be a blank render, `null`, or skipped. If the design for an empty/error state is not obvious, ask before inventing.

### Action feedback (mandatory for every button and mutation)

Every button or action that triggers a mutation must have immediate visual feedback — the user must know something happened before the server responds:

| Moment | Required behavior |
|--------|-----------------|
| **On press** | Instant visual change — opacity, scale, or spinner. Never a delay before any feedback. |
| **In progress** | Button disabled + spinner or "Guardando…" label. Prevent double-submit. |
| **On success** | Confirm state or navigate away. Never silently reset to initial state. |
| **On error** | Inline error message near the action. Button re-enabled. User can retry. |

```tsx
// ✅ Pattern
const [isPending, startTransition] = useTransition()

<button
  disabled={isPending}
  className={cn("min-h-[44px] ...", isPending && "opacity-60 cursor-not-allowed")}
  onClick={() => startTransition(async () => { ... })}
>
  {isPending ? <Spinner /> : 'Guardar'}
</button>
```

No action may complete or fail silently. No button may remain in a loading state without a timeout or error recovery path.

---

## Step 6 — Touch targets (mandatory)

Every interactive element must have a minimum touch target of 44px height:

```tsx
// ✅
className="min-h-[44px] flex items-center"

// Common violations to check: nav items, icon buttons, list rows, toggle switches
```

Verify by inspecting element height in DevTools, not by eyeballing.

---

## Step 7 — iPhone test (hard gate before Done)

Before calling `done`, verify the implementation at 390px (iPhone 14):

1. Open Chrome DevTools → Device Toolbar → set to 390×844
2. No content hidden behind the fixed header
3. No content hidden behind the fixed bottom nav
4. Safe-area insets respected (test in the installed PWA if possible, or use the SafeAreaSimulator if configured)
5. All interactive elements visually adequate for tapping (min 44px)
6. Accent color appears in less than ~10% of screen area
7. Loading, empty, and error states are reachable and render correctly
8. **Complete flow test:** Navigate to the screen from another screen → trigger the primary action → verify the feedback state (spinner/disabled) → confirm the success state or error state. At least one complete flow must be exercised, not just a static render check.

If any check fails: fix it. This is not a soft gate — do not proceed to `done` with a failing iPhone test.

---

## Output

After implementing, produce this block before calling `done`:

---
**Componente/Sección:** `[nombre]` en `[path]`
**Componentes reutilizados:** [lista o "ninguno"]
**Componentes nuevos creados:** [lista o "ninguno"]
**Componentes extraídos por repetición:** [lista o "ninguno"]
**Estados de datos:** loading ✅ / empty ✅ / error ✅
**Feedback de acciones:** on-press ✅ / in-progress ✅ / on-success ✅ / on-error ✅
**Touch targets:** ✅ verificados ≥ 44px
**iPhone test:** ✅ verificado a 390px — flujo completo: [describe el flujo ejercido]
**Decisiones de diseño asumidas sin grill-me:** [lista o "ninguna"]
**Anti-patrones corregidos en archivos tocados:** [lista o "ninguno"]
---
