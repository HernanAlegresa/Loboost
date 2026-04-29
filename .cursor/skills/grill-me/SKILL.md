---
name: grill-me
description: Alignment protocol before feature work. Use when requirements are unclear, scope is undefined, or the task touches business logic, DB, or UX. Interrogates the user iteratively to establish full shared context before any implementation. If there is any doubt about whether the scope is clear enough to implement, use this skill first.
---

# Grill Me — Alignment Protocol

## When to use

- The requirement is ambiguous or incomplete
- The scope of the task is not well defined
- The task touches business logic, DB, or UX
- The user says "quiero hacer X" without a clear spec
- It's unclear what "done" looks like

## Interrogation process

Ask **between 1 and 3 focused questions per round**. Choose fewer when one question unblocks the others; only ask more when multiple dimensions are genuinely unclear in parallel.

Ask one round at a time. Wait for the user's answers before continuing. Do not dump all questions upfront.

Focus areas per round:
- **Scope**: What changes exactly? What stays the same? What does "done" look like?
- **Constraints**: Does this touch DB or auth? Are there existing patterns to follow? Are there past decisions in `docs/decisions/` that apply?
- **Risks**: What could break? Are there dependencies on other in-progress features?

Keep iterating until there is enough shared context to proceed confidently. Do not force the user to write a formal spec — stay conversational and direct. If something is still unclear after several rounds, ask a more targeted question rather than escalating to documentation.

## Output

Once the context is clear, produce this exact block in the chat:

---
## Contexto acordado

**Qué hacemos:** [una oración]
**Archivos involucrados:** [lista concreta de archivos o componentes]
**Constraints:** [lo que no podemos romper — o "ninguno"]
**Riesgos:** [lo que puede fallar — o "ninguno"]
**Próximo paso:** [slice | implementar directamente]
---

The "Próximo paso" must be explicit:
- **slice** — if the work has multiple independent parts that benefit from being broken down first
- **implementar directamente** — if the scope is small and clear enough to proceed without decomposition

Do not generate files. This output lives in the chat only.
