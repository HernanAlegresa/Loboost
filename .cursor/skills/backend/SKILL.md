---
name: backend
description: Backend implementation protocol for LoBoost queries, server actions, and DB-bound types. Use before writing code that crosses the Supabase boundary. Enforces auth ownership checks, domain invariants, and safe delivery gates.
---

# Backend — Implementation Protocol

## When to use

- Adding a new query function
- Adding or modifying a server action (mutation)
- Adding types for a new data shape that comes from the DB

**Prerequisite:** This skill runs within an approved slice. If there is no slice context in the current conversation, invoke `grill-me` first.

## Step 1 — Escalation gate (hard stop)

If the task requires any of the following, STOP. Describe what is needed and wait for explicit confirmation before writing a single line of code:

- DB schema change (new table, new column, index, RLS policy)
- Auth or permission logic change
- New relationship between domain entities

This is a hard gate — not a question. Do not proceed based on "probably fine."

## Step 2 — Discover before writing

Before writing any new code, search the domain and feature files for:
- Existing query functions that overlap with what you are implementing
- Existing types that match the data shape you need
- Existing shared utilities relevant to the operation

Extend or reuse before creating. If a new function is truly necessary, note why it cannot be an extension of something that already exists.

If the behavior touches business rules, review relevant files in `docs/decisions/` before coding.

## Step 3 — File placement

Apply these principles — do not invent new locations:

- **Co-location:** Queries and types belong next to the route or feature that owns them. Only move to a shared layer if the same code is needed by more than one route.
- **Read/write separation:** Read queries and write mutations (server actions) live in separate files within the same feature folder.
- **Internal order:** types → private helpers → exported functions.

## Step 4 — Query patterns

- Receive `clientId` and `coachId` (or equivalent auth context) as explicit parameters — never read auth state inside a query function
- Call `createClient()` as the first statement of each function (not shared between functions)
- Auth guard first: verify the caller has permission before any additional data fetches; return `null` on failure
- Return `null` for auth failures, empty arrays or objects for missing data — never throw
- Use `Promise.all()` when two or more independent fetches can run in parallel
- Prefer explicit `select(...)` with only required columns
- Never hand-edit `src/types/database.ts` (generated artifact)

## Step 5 — Server action patterns

- Start with `'use server'`
- Validate and sanitize all inputs before any DB write
- Re-verify auth inside the action — do not trust params passed from the client
- Return a typed result object, not raw Supabase responses
- Preserve domain invariants:
  - `plans` are coach templates
  - `client_plans` are assigned copies
  - assignment flows create copies, not mutable references

## Output

After implementing, produce this block before calling `done`:

---
**Función/Action:** `[nombre]` en `[path]`
**Comportamiento habilitado:** [qué flujo funcional esto hace posible — una oración]
**Retorna:** [tipo | null]
**Auth guard:** [sí — cuál | no]
**Schema changes:** [ninguno | descripción]
**Invariante de dominio:** [cómo se preserva | no aplica]
---
