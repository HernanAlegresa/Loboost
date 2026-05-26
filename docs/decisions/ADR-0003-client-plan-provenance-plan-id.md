# ADR-0003: Client plan provenance uses `client_plans.plan_id`

- Status: Accepted
- Date: 2026-05-12
- Owners: LoBoost Engineering
- Supersedes: None

## Context

The coach assign flow creates independent copies (`client_plans`) from library templates (`plans`).
For Slice 1, the product and engineering requirement is to persist provenance of which template produced each client copy.

Current schema already includes:

- `client_plans.plan_id` (nullable FK to `plans.id`)
- generated types in `src/lib/supabase/database.types.ts` for this FK
- `setupClientPlanAction` inserting `plan_id: plan.id`

The planning doc (`docs/plans/client-assign-flow.md`) considered introducing a new
`source_plan_id` column for semantic clarity.

## Decision

Use existing `client_plans.plan_id` as the canonical template provenance field.

No new `source_plan_id` column is introduced in Slice 1.
`setupClientPlanAction` must keep writing the selected template id to `client_plans.plan_id`.

Documentation must treat `plan_id` as "source template id" for client copies.

## Consequences

### Positive

- No migration needed for Slice 1.
- No generated-type churn.
- Keeps provenance explicit and queryable with current FK constraints.
- Avoids ambiguous dual provenance fields (`plan_id` + `source_plan_id`).

### Negative

- Name `plan_id` is generic and could be interpreted as "active plan relation" instead of "source template".
- If future domain semantics diverge, a rename/migration may still be required.

## Rollback / Revisit Trigger

Revisit this ADR if any of these happen:

- Product requires `plan_id` for a different semantic relation than source template.
- A migration introduces multiple template lineages per client plan.
- Reporting/analytics cannot satisfy provenance queries with `plan_id` alone.
