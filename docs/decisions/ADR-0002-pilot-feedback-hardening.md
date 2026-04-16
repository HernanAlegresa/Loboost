# ADR-0002: Pilot-Driven Hardening for Backend Atomicity

- Status: Accepted
- Date: 2026-04-16
- Owners: LoBoost Engineering
- Supersedes: None

## Context

Pilot validation (`docs/ai/pilot-report.md`) showed good adherence in frontend and base data-access patterns, but identified a backend risk: mutation flows that may update related entities without guaranteed atomic consistency.

## Decision

Update governance artifacts to require atomic lifecycle updates for multi-entity domain transitions:

- Extend `.cursor/rules/20-supabase.mdc` with a multi-entity consistency section.
- Extend `.cursor/skills/backend-server-actions/SKILL.md` checklist with atomicity/rollback requirement.

## Consequences

### Positive

- Reduces risk of inconsistent domain state after partial failures.
- Makes backend mutation quality bar explicit for agents.

### Negative

- Some simple actions may require additional implementation effort.
- May increase initial design time for write paths.

## Rollback / Revisit Trigger

Revisit if added atomicity constraints create repeated unnecessary complexity for low-risk, single-entity updates across two review cycles.
