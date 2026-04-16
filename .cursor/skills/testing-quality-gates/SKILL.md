---
name: testing-quality-gates
description: Enforces evidence-based delivery in LoBoost through TypeScript and test verification gates. Use before marking work complete, especially for feature, data-access, or refactor changes.
---

# Testing Quality Gates

## Scope

Apply before completion claims and after non-trivial changes.

## Do

- Run `npx tsc --noEmit` for code changes.
- Run targeted Jest suites for impacted features first.
- Run broader tests when changes are cross-cutting.
- Report exact verification commands and outcomes.

## Dont

- Do not claim success without executed evidence.
- Do not skip verification due to assumptions.
- Do not hide failing tests; surface blockers and next action.

## Checklist

- [ ] Type checks executed or blocker documented.
- [ ] Relevant tests executed or blocker documented.
- [ ] Failures mapped to impacted files and probable cause.
- [ ] Final report includes residual risk when full suite was not run.

## Examples

- Feature action change: run feature tests + typecheck.
- Shared utility change: run utility tests plus any dependent flow tests.
