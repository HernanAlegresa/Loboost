---
name: supabase-data-access
description: Applies consistent Supabase access patterns for LoBoost including server/client/admin usage, RLS-safe querying, and migration-first schema evolution. Use for any database or auth data-access change.
---

# Supabase Data Access

## Scope

Apply when reading/writing Supabase data or changing DB shape.

## Do

- Use `@/lib/supabase/server` in server contexts.
- Use `@/lib/supabase/client` only in browser contexts.
- Use admin/service-role access only through controlled server paths.
- Keep schema evolution in `supabase/migrations/*.sql`.
- Regenerate `src/types/database.ts` after migration changes.

## Dont

- Do not hand-edit generated DB types.
- Do not expose service-role operations to client components.
- Do not perform broad unscoped selects when narrow queries are possible.

## Checklist

- [ ] Access client choice (server/client/admin) is correct.
- [ ] RLS assumptions are explicit and supplemented by action checks when needed.
- [ ] Query selects only required fields.
- [ ] Migration and type regeneration needs were evaluated.

## Examples

- Coach-owned resource fetch must filter by authenticated coach identity.
- Schema change must include SQL migration + regenerated DB types.
