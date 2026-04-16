# Architectural Decisions

This folder is the canonical log for non-trivial technical and AI-governance decisions in LoBoost.

## Why this exists

- Preserve rationale beyond chat history.
- Prevent repeated debates on already settled architecture.
- Keep Cursor/agent behavior aligned with long-term product constraints.

## File naming

- `ADR-0001-<short-topic>.md`
- `ADR-0002-<short-topic>.md`
- Use increasing sequence numbers.

## When to write an ADR

- Architecture or domain model changes.
- Data-access/security policy changes.
- AI workflow/governance decisions that affect day-to-day delivery.
- Tooling choices with ongoing cost (MCP, testing, build, deployment).

## Required sections

- Status
- Context
- Decision
- Consequences
- Rollback / Revisit trigger

Use [`ADR-TEMPLATE.md`](ADR-TEMPLATE.md) as baseline.
