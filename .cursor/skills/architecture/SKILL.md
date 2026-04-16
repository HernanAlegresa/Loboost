---
name: architecture
description: Enforces LoBoost architecture boundaries and code placement decisions. Use when adding features, refactoring structure, or deciding where code should live across src/app, src/features, src/lib, and src/components.
---

# Architecture

## Scope

Apply when deciding structure, file placement, or domain boundaries.

## Do

- Keep domain logic in `src/features/<feature>/`.
- Keep route composition and page-specific queries in `src/app/**`.
- Keep cross-cutting helpers in `src/lib/`.
- Reuse shared UI primitives from `src/components/ui/`.
- Respect route groups `(coach)`, `(client)`, `(training)`, `(auth)`.

## Dont

- Do not place reusable business logic directly in page files.
- Do not bypass feature schemas/types for domain changes.
- Do not mix coach/client responsibilities in one route flow.

## Checklist

- [ ] File location matches architectural responsibility.
- [ ] Domain invariants (`plans` vs `client_plans`) preserved.
- [ ] Any new abstraction has at least two consumers or clear reuse path.
- [ ] Imports use project alias conventions and avoid layer inversion.

## Examples

- New mutation for client progress: `src/features/training/actions/*`.
- New coach dashboard query: `src/app/(coach)/coach/dashboard/queries.ts`.
- Shared date helper: `src/lib/*`, not inside a page component.
