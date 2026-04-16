# ADR-0001: Cursor AI Governance Baseline

- Status: Accepted
- Date: 2026-04-16
- Owners: LoBoost Engineering

## Context

LoBoost has multiple context artifacts (`AGENTS.md`, `CLAUDE.md`, plans/specs/handoffs) but no enforceable in-repo runtime policy for Cursor. This causes drift across sessions and increases low-value rework.

## Decision

Adopt a layered governance model:

1. `.cursor/rules/*.mdc` is the enforceable runtime source of truth.
2. `.cursor/skills/*/SKILL.md` holds role-specific execution playbooks.
3. `AGENTS.md` remains human onboarding and historical context.
4. `CLAUDE.md` is treated as legacy pointer and not canonical policy.
5. `docs/decisions/*` stores non-trivial architecture and workflow decisions.

Agent decision policy:
- Act autonomously for low-risk, reversible tasks.
- Escalate for high-impact ambiguity (security/auth/schema/public contracts).
- For non-trivial changes, use: Context -> Options -> Decision -> Risks -> Validation.

## Consequences

### Positive

- Consistent architecture enforcement across sessions.
- Faster execution with fewer generic responses.
- Explicit long-term memory for technical decisions.

### Negative

- Requires ongoing maintenance of rules/skills.
- Initial setup overhead before full ROI.

## Rollback / Revisit Trigger

Revisit this ADR if either condition holds for 2 consecutive review cycles:
- More than 20% of merged PRs require architecture-policy corrections.
- Team reports that rules materially slow delivery without quality gains.
