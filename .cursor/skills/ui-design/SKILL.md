---
name: ui-design
description: Design and implementation protocol for UI components and screens in LoBoost. Use before building new screens, navigation elements, headers, footer nav, or any layout composition.
---

# UI Design — Component & Screen Protocol

## When to use
- Designing a new screen, page, or full layout
- Adding or modifying navigation (header, footer nav, bottom bar)
- Building a new component or redesigning an existing one
- When "done" means a polished, pixel-accurate result matching the LoBoost system

## Design system reference
All design decisions must use tokens from `docs/design/DESIGN.md`. Never introduce arbitrary values.

**Core tokens:**
- Background: `bg-base #0A0A0A` / `bg-surface #111317` / `bg-elevated #1A1D22`
- Accent: `#B5F23D` — use selectively (<10% of screen). Primary CTAs, active states, progress.
- Text: `text-primary #F0F0F0` / `text-secondary #6B7280`
- Border: `border-subtle #1F2227` / `border-default #2A2D34`
- Spacing base: 4px. Common: 4/8/12/16/20/24/32
- Mobile first: 390px (iPhone 14). Padding: `px-5` mobile, `px-6` desktop.

**Typography scale (Inter):**
- `display`: 24px/700 — page titles
- `heading`: 18px/600 — section titles
- `body`: 15px/400 — card content
- `label`: 13px/500 — labels, names
- `caption`: 12px/400 — metadata, dates
- `overline`: 11px/600 uppercase + letter-spacing — section headers

## Step 1 — Audit before creating

Before writing any component, search:
1. Does this component already exist in `src/components/ui/`?
2. Is there a similar pattern in the same route group (`src/app/(coach)`, `src/app/(client)`, etc.)?
3. For headers: check `DynamicHeader` and `FlowHeaderConfig` pattern established in `src/` — use it, don't create a parallel system.
4. For footer/bottom nav: check existing navigation components before creating new ones.

Extend or reuse before creating. Document why a new component is needed if one doesn't exist.

## Step 2 — Propose before building

For any non-trivial UI work, output a visual spec in the chat before writing code:

---
**Componente/Screen:** [nombre]
**Layout:** [descripción del layout en palabras — secciones, jerarquía visual]
**Tokens usados:** [lista de colores, spacing, tipografía del design system]
**Componentes reutilizados:** [lista o "ninguno"]
**Componentes nuevos necesarios:** [lista con justificación o "ninguno"]
**Interacciones:** [estados hover/active/loading/empty si aplican]
---

Wait for approval before writing code.

## Step 3 — Implementation rules

- Server Components by default. Add `'use client'` only if there's real interactivity (state, event handlers, browser APIs).
- Mobile-first always. Test mentally at 390px first.
- Use Tailwind with design system values. No arbitrary values unless no token exists.
- Framer Motion for transitions when needed: `opacity 0→1 150ms ease` for fades, `translateY 6px→0 200ms` for cards.
- Keep navigation layout behavior consistent per route group — don't break existing patterns.

## Step 4 — Done

After implementation, invoke `.cursor/skills/done/SKILL.md`.
