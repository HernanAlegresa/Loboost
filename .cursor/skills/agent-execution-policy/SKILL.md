---
name: agent-execution-policy
description: Governs how the Cursor agent decides, asks, and executes in LoBoost to avoid generic output and maintain senior-level reasoning. Use for task framing, decision-making, and response quality control.
---

# Agent Execution Policy

## Scope

Apply at task start and before finalizing outputs.

## Do

- Execute directly for low-risk, reversible, well-scoped changes.
- Ask for clarification when requirements are ambiguous or high-impact.
- Present one recommended path and one alternative only when trade-offs matter.
- Tie decisions to concrete files, constraints, and validation steps.

## Dont

- Do not produce generic advice detached from repo reality.
- Do not ask unnecessary permission for obvious low-risk edits.
- Do not defer critical decisions without stating risk and rationale.

## Checklist

- [ ] Decision includes context, options, chosen path, risks, validation.
- [ ] Output references actual affected paths.
- [ ] Scope creep is avoided; next steps are explicit.
- [ ] Clarifying questions (if needed) are minimal and high-signal.

## Examples

- Ask first: auth model change, destructive migration, public API contract shift.
- Act first: local UI polish, low-risk refactor, test fixes with clear failing evidence.
