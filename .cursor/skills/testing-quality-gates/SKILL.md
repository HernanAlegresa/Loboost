---
name: testing-quality-gates
description: Quality gates for critical business logic and bugfixes. Use when changes can affect domain behavior, permissions, lifecycle state, or multi-entity consistency.
---

# Testing Quality Gates

## When to use

- Critical business logic changes
- Bugfixes that affect domain state transitions
- Mutations touching multiple entities
- Permission or ownership checks that remain within approved policy scope

## Step 1 — Define risk before coding

Write this block in chat before implementation:

---
**Flujo crítico:** [qué comportamiento sensible puede romperse]
**Riesgo principal:** [inconsistencia | permisos | regresión funcional]
**Prueba mínima obligatoria:** [test automatizado o verificación manual concreta]
---

## Step 2 — Verification gates

For critical logic changes, do not declare done unless all gates pass:

1. Run targeted tests for the touched feature (if they exist).
2. If no tests exist, add at least one focused test when feasible.
3. Always run `npx tsc --noEmit`.
4. Provide one end-to-end manual verification path.

If test infra does not exist or cannot run, explicitly report it as residual risk.

## Step 3 — Output

Before invoking `done`, write:

---
**Tests ejecutados:** [comando + resultado]
**Cobertura del riesgo:** [qué riesgo quedó cubierto]
**Gap restante:** [ninguno | qué falta cubrir]
---
