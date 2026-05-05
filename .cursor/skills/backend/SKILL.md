---
name: backend
description: Implementation protocol for backend work in LoBoost — queries, types, server actions, and RLS-first data access. Use before writing any query function, server action, or data type that crosses the Supabase boundary. Must run within an approved slice context.
---

# Backend — Implementation Protocol

## When to use

- Adding a new query function
- Adding or modifying a server action (mutation)
- Adding types for a new data shape that comes from the DB
- Writing or modifying any Supabase RPC call

**Prerequisite:** This skill runs within an approved slice. If there is no slice context in the current conversation, invoke `grill-me` first.

## Agent behavior constraints

These are hard rules — not guidelines, not preferences:

- **Zero implicit trust.** Never assume that RLS covers an access pattern without verifying it. Never assume that a parameter received from the client is safe without checking it against `auth.uid()` server-side.
- **Explicit reasoning before code.** Every query requires a written isolation chain declaration (Step 2) before any code is written. Skipping it is not a shortcut — it is the source of security bugs.
- **RLS first.** Any data access problem should be solved with RLS policies before reaching for other mechanisms. SECURITY DEFINER and service role are last resorts, not defaults.
- **No improvising on auth.** If the correct permission model for a new access pattern is unclear, stop and escalate. Do not write an approximation.

---

## Step 1 — Escalation gate (hard stop)

If the task requires any of the following, STOP. Describe what is needed and wait for explicit confirmation before writing a single line of code:

- DB schema change (new table, new column, index)
- New or modified RLS policy
- New SECURITY DEFINER function (see prohibition below)
- Any use of `SUPABASE_SERVICE_ROLE_KEY`
- Auth or permission logic change
- New relationship between domain entities

**SECURITY DEFINER — prohibited by default:**
Do not write `SECURITY DEFINER` functions. Almost all access patterns in LoBoost can and should be handled by RLS policies on the tables. If you believe SECURITY DEFINER is truly necessary, escalate with:
1. Why the access pattern cannot be expressed as an RLS policy
2. What the function will do
3. Acknowledgment that it will require: `SET search_path = ''`, explicit `auth.uid()` check in the WHERE clause, and a documented justification in the migration file

**Service role — prohibited by default:**
Never use `SUPABASE_SERVICE_ROLE_KEY` or create a service-role Supabase client in any code path that runs during an authenticated user request. Service role bypasses RLS entirely. If a background job or webhook requires it in the future, escalate — it must never appear in feature code.

This is a hard gate — not a question. Do not proceed based on "probably fine."

---

## Step 2 — Isolation chain declaration (before writing any query)

Before writing any query or action that touches the DB, write out the isolation chain in plain text:

```
Caller:      [coach | client | unauthenticated]
Root table:  [table where auth.uid() is anchored]
Chain:       [table → join → ... → auth.uid() check]
RLS covers:  [yes — describe the policy | no — escalate]
```

**Known chains in LoBoost:**

| Caller | Access | Chain |
|--------|--------|-------|
| Coach | Own clients | `profiles.coach_id = auth.uid()` |
| Coach | Client sessions | `sessions.client_id → profiles.coach_id = auth.uid()` |
| Coach | Client session sets | `session_sets.session_id → sessions.client_id → profiles.coach_id = auth.uid()` |
| Coach | Client measurements | `body_measurements.client_id → profiles.coach_id = auth.uid()` |
| Coach | Own notes | `coach_notes.coach_id = auth.uid()` |
| Client | Own sessions | `sessions.client_id = auth.uid()` |
| Client | Own session sets | `session_sets.session_id → sessions.client_id = auth.uid()` |
| Client | Own measurements | `body_measurements.client_id = auth.uid()` |

If the chain for the new query is not in this table: stop. Document the new chain and confirm it is covered by an existing RLS policy before proceeding. If no policy covers it, that is a schema change — return to Step 1.

If the chain passes through a join that is not enforced by the RLS policy on the queried table, the query is not safe — rewrite it or escalate.

**No assumed relationships.** Do not use a join between two tables unless that FK relationship is defined in the migrations. If you are unsure whether a relationship exists: check `supabase/migrations/` before writing the query. Assumed joins that don't exist in the schema are silent bugs — the query returns empty results with no error.

**Caller role must be read from the DB, not inferred.** The caller's role (`coach` or `client`) must come from `profiles.role` queried against `auth.uid()` — never from a URL segment, a client-side parameter, or an assumption based on which route is being called. A coach browsing a client-facing URL should still be identified as a coach.

---

## Step 3 — Discover before writing

Before writing any new code, search the domain and feature files for:
- Existing query functions that overlap with what you are implementing
- Existing types that match the data shape you need
- Existing shared utilities relevant to the operation

```bash
# Find existing queries for a domain
grep -r "from('sessions')\|from('session_sets')" src/features --include="*.ts" -l

# Find existing types
grep -r "type.*Session\|interface.*Session" src/ --include="*.ts" -l
```

Extend or reuse before creating. If a new function is truly necessary, note why it cannot be an extension of something that already exists.

---

## Step 4 — File placement

Apply these principles — do not invent new locations:

- **Co-location:** Queries and types belong next to the route or feature that owns them. Only move to a shared layer if the same code is needed by more than one route.
- **Read/write separation:** Read queries and write mutations (server actions) live in separate files within the same feature folder.
- **Internal order within a file:** types → private helpers → exported functions.

---

## Step 5 — Query patterns

```ts
// ✅ Canonical structure
export async function getClientSessions(clientId: string): Promise<Session[] | null> {
  const supabase = await createClient()                    // 1. Client first

  const { data: { user }, error: authError } =
    await supabase.auth.getUser()
  if (authError || !user) return null                      // 2. Auth guard — return null on failure

  const { data, error } = await supabase
    .from('sessions')
    .select('...')
    .eq('client_id', clientId)                            // 3. Explicit filter
    .order('created_at', { ascending: false })

  if (error) return null                                   // 4. Null on DB error, never throw
  return data
}
```

Rules:
- `createClient()` is called as the first statement of each function — never shared between functions
- Auth guard runs before any data fetch — if auth fails, return `null` immediately
- `clientId` and `coachId` (or equivalent) are received as explicit parameters — never read from auth state inside a query function (auth state belongs in the action layer)
- Return `null` for auth failures; return empty array or empty object for missing data
- Use `Promise.all()` when two or more independent queries can run in parallel
- Never return raw Supabase response objects — always extract and type the data

**RLS is not a substitute for explicit filters.** Even when RLS restricts rows by `auth.uid()`, always include the relevant `eq()` filter explicitly. This makes the intent readable and prevents silent failures when RLS policies change.

**No broad queries.** Every query must be bounded by at least one explicit ownership filter (e.g., `.eq('client_id', clientId)`). Never query a table without a filter that limits the result set to data the caller owns — not even in a context where RLS "should" cover it. Select only the columns actually needed — never `.select('*')` in production code.

---

## Step 6 — Server action patterns

```ts
'use server'

export async function updateSessionAction(
  sessionId: string,
  payload: UpdateSessionPayload
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // 1. Re-verify auth inside the action — never trust params from the client
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  // 2. Validate and sanitize all inputs before any DB write
  const result = updateSessionSchema.safeParse(payload)
  if (!result.success) return { error: result.error.issues[0]!.message }

  // 3. Write with explicit ownership filter — never rely on RLS alone
  const { error } = await supabase
    .from('sessions')
    .update({ ... })
    .eq('id', sessionId)
    .eq('client_id', user.id)   // explicit — do not omit

  if (error) return { error: 'Error al actualizar la sesión' }
  return { success: true }
}
```

Rules:
- Start with `'use server'`
- Re-verify auth as the first operation — the action must not trust any parameter received from the client as proof of identity
- Validate all inputs with a schema (Zod) before any DB write
- Return a typed result object — never return raw Supabase responses or throw to the caller
- On error: return `{ error: string }` with a user-facing message — do not expose internal DB errors

---

## Step 7 — Data integrity checks

Before writing a mutation, confirm:

1. **Entity exists and belongs to caller:** If the action operates on an entity by ID (e.g., `sessionId`), verify it exists and is owned by the authenticated user before mutating. Do not rely solely on the UPDATE returning 0 rows.

2. **Status transitions are valid:** If the entity has a status field, enforce valid transitions explicitly (e.g., a session can only be `completed` if it is currently `in_progress`).

3. **No orphaned writes:** If the action creates a child record, confirm the parent exists and belongs to the caller before inserting.

```ts
// ✅ Verify ownership before mutating
const { data: session } = await supabase
  .from('sessions')
  .select('id, status, client_id')
  .eq('id', sessionId)
  .eq('client_id', user.id)     // ownership check
  .single()

if (!session) return { error: 'Sesión no encontrada' }
if (session.status !== 'in_progress') return { error: 'La sesión ya fue completada' }
```

---

## Output

After implementing, produce this block before calling `done`:

---
**Función/Action:** `[nombre]` en `[path]`
**Caller rol:** [coach | client — leído de profiles.role, no inferido]
**Isolation chain:** `[caller] → [chain] → auth.uid()`
**RLS cubre el acceso:** [sí — política: X | no — escalado]
**Comportamiento habilitado:** [qué flujo funcional esto hace posible — una oración]
**Retorna:** [tipo | null]
**Auth guard:** [sí — cuál | no]
**Validación de inputs:** [sí — schema: X | no aplica]
**Integridad verificada:** [checks realizados o "no aplica"]
**Schema changes:** [ninguno | descripción]
**SECURITY DEFINER usado:** [no | sí — justificación aprobada]
---
