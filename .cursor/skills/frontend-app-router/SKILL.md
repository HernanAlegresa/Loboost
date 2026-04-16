---
name: frontend-app-router
description: Implements frontend features using Next.js App Router conventions in LoBoost. Use when creating or updating pages, layouts, route-group flows, and client/server component boundaries.
---

# Frontend App Router

## Scope

Apply when building UI in `src/app` and composing client/coach/training flows.

## Do

- Default to Server Components; use `'use client'` only for interactivity/state.
- Keep route-group UX consistent: `(training)` full-screen, `(client)` with client nav, `(coach)` coach shell.
- colocate route query helpers as `queries.ts` when tied to that route.
- Prefer explicit loading/empty/error states for all data-driven screens.

## Dont

- Do not move server-only data access into client components.
- Do not introduce incompatible navigation patterns per route group.
- Do not add generic UI styles that conflict with LoBoost product identity.

## Checklist

- [ ] Component boundary (server/client) is intentional.
- [ ] Data is fetched in server layer when possible.
- [ ] Route-level UX states are complete (loading/empty/error).
- [ ] New screen aligns with existing mobile-first interaction patterns.

## Examples

- Interactive form using `useActionState`: client component + server action.
- Page data fetch: server page calling local `queries.ts`.
