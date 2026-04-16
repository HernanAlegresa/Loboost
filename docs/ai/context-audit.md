# LoBoost AI Context Audit

## Purpose

Consolidate existing guidance from `AGENTS.md`, `CLAUDE.md`, and `docs/superpowers` into one operational baseline for Cursor rules and skills.

## Source Inventory

| Source | Role | Reliability | Notes |
|---|---|---|---|
| `AGENTS.md` | Operational conventions for agents | High | Most aligned with current app structure and Next.js behavior. |
| `CLAUDE.md` | Legacy high-level conventions | Medium | Useful, but partially outdated (mentions older stack phase/version). |
| `docs/superpowers/handoffs/cursor-development-log.md` | Chronological implementation log | High | Best source for recent architecture and real implemented flows. |
| `docs/superpowers/specs/*.md` | Product/UI intent | Medium | Some specs represent desired state, not always current implementation. |
| `docs/superpowers/plans/*.md` | Execution plans/checklists | Medium | Great for rationale; may include superseded steps after scope changes. |
| `docs/design/DESIGN.md` | Visual tokens/system | High | Canonical product visual language (dark + lime, mobile-first). |

## Consolidated Rules Matrix

| Topic | Canonical Rule | Primary Source | Conflicts / Action |
|---|---|---|---|
| Runtime framework | Use current Next.js App Router conventions; treat route `params` as async where required and verify against installed docs | `AGENTS.md`, codebase reality | `CLAUDE.md` references older Next version; mark as legacy and defer to rules. |
| Project structure | Keep domain logic in `src/features/*`, app wiring in `src/app/*`, shared infra in `src/lib/*`, shared UI in `src/components/*` | `CLAUDE.md`, `AGENTS.md` | No conflict. |
| Role separation | Preserve `(coach)`, `(client)`, `(auth)`, `(training)` route-group boundaries | `AGENTS.md`, handoff log | No conflict. |
| Supabase access | Server-side access via `@/lib/supabase/server`; never expose privileged access to client components | `AGENTS.md`, existing code | No conflict. |
| DB types | `src/types/database.ts` is generated only; never hand-edit | `AGENTS.md`, `CLAUDE.md` | No conflict. |
| Domain invariant | `plans` are coach templates; `client_plans` are assigned copies; never mutate templates from client flow | `AGENTS.md`, `CLAUDE.md` | No conflict. |
| Validation | Keep Zod schemas in `features/<feature>/schemas.ts` and reuse in actions | `AGENTS.md`, `CLAUDE.md` | No conflict. |
| UI system | Follow LoBoost dark + lime product system and mobile-first behavior | `docs/design/DESIGN.md`, `AGENTS.md` | Clarify inline styles vs utility classes by surface (set in UI rules). |
| Testing quality | Verify with TypeScript and Jest before completion claims | handoff log, repo scripts | No conflict. |
| Planning workflow | Keep plan/spec/handoff traceability for non-trivial work | `docs/superpowers/*` | No conflict. |

## Baseline Decisions (for Cursor system)

1. `AGENTS.md` stays as human-readable onboarding and historical context.
2. `.cursor/rules/*` becomes the enforceable source of truth for agent behavior.
3. `CLAUDE.md` becomes legacy pointer, not the live policy source.
4. ADRs in `docs/decisions/` store non-trivial architectural and AI-governance decisions.

## Gaps To Close Immediately

- No `.cursor/rules` hierarchy exists yet.
- No project-local `.cursor/skills` exists yet.
- No explicit policy for MCP ROI and safe usage.
- No periodic governance cadence document exists.

## Acceptance Criteria for this audit

- Baseline conflicts identified and resolved by precedence.
- Canonical topics mapped to a primary source.
- Next phase (rules + skills + ADRs) has explicit inputs.
