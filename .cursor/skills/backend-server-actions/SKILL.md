---
name: backend-server-actions
description: Standardizes LoBoost backend mutations through Next.js Server Actions with validation, authorization, and safe error handling. Use when creating or modifying write operations.
---

# Backend Server Actions

## Scope

Apply to all write paths implemented with `'use server'`.

## Do

- Validate all user inputs with feature-level Zod schemas.
- Enforce role/ownership checks before writes.
- Use clear return contracts for UI feedback (`success`/`error` states).
- Revalidate paths or trigger expected cache updates after successful writes.
- Use atomic DB patterns (transaction/RPC) when a single user action changes multiple related entities.

## Dont

- Do not trust raw `FormData` without schema parsing.
- Do not write actions that silently swallow errors.
- Do not duplicate authorization logic inconsistently across actions.

## Checklist

- [ ] Input parsing is strict and centralized in schema.
- [ ] AuthN/AuthZ checks are explicit.
- [ ] Error messages are user-safe and actionable.
- [ ] Side effects (cache, redirects) are deliberate and tested.
- [ ] Multi-table state transitions are atomic or have explicit rollback handling.

## Examples

- `useActionState` forms: action signature `(prevState, formData)`.
- Transition-triggered action: explicit parameter contract and returned status object.
