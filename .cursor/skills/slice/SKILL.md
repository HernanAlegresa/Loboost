---
name: slice
description: Decompose aligned feature context into ordered, independently verifiable vertical slices. Use after grill-me outputs "Próximo paso: slice", or when the task has multiple parts with dependencies and the execution order is not obvious.
---

# Slice — Vertical Decomposition Protocol

## When to use

- `grill-me` finished with `Próximo paso: slice`
- The feature has multiple parts with dependencies between them
- The execution order is not obvious

## What a slice is NOT

A slice is not a layer. Do not create one slice per layer (DB → backend → UI). That produces horizontal work that can't be tested end-to-end until everything is done.

A valid slice crosses all the layers needed for the feature to work minimally but completely. After a slice is implemented, a user (or the developer) must be able to exercise the full flow — even if it's rough.

**Anti-pattern:**
- Slice 1: migration
- Slice 2: server action
- Slice 3: UI

**Correct pattern:**
- Slice 1: migration + server action + basic UI — the feature works end-to-end, minimally
- Slice 2: improve UX, add validations, edge cases

## Process

**Step 1 — Read context**

Use the "Contexto acordado" block from the chat. If it's not present, ask for it before continuing.

**Step 2 — Map layers**

Identify which layers the feature touches overall:
- **DB** — migrations, new tables/columns, RLS policies
- **Backend** — server actions, queries, types
- **UI** — components, routes, forms

**Step 3 — Compose slices**

Think in terms of feature increments, not layer tasks. Ask: "what is the thinnest vertical cut that produces a working, testable flow?"

- The first slice usually covers the happy path across all required layers
- Subsequent slices extend, improve, or handle edge cases
- Each slice must be independently verifiable — after it's done, the developer can test the behavior without waiting for the next slice

Order slices by dependency — a slice can only build on layers introduced by previous slices.

If the resulting list is long, surface that to the user as a signal that the scope may be too large. Do not cap it artificially.

## Output

Produce this list in the chat and wait for user approval. Do not proceed to implementation.

---
## Slices

### Slice 1 — [nombre]
**Qué hace:** [una oración describiendo el flujo completo que habilita]
**Capas:** [DB | backend | UI — todas las que este slice necesita]
**Archivos:** [lista concreta]
**Verificación:** [acción del usuario o comando que confirma el flujo completo funcionando]

### Slice 2 — [nombre]
...
---

Each slice name should describe the behavior it enables, not the layer it touches. The numbered order is the execution order.
