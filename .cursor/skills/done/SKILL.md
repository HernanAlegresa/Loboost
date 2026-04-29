---
name: done
description: Final verification checklist before declaring a slice or feature complete. Use after implementing any slice, before reporting done to the user, and before any commit or PR. Enforces the Definition of Done with real evidence, not assertions.
---

# Done — Delivery Verification

## When to use

- A slice or feature has been implemented
- Before reporting "listo" to the user
- Before any commit or PR

## Process

### Step 1 — Run tsc (hard gate)

Run `npx tsc --noEmit` and capture the output.

- If it passes: continue to Step 2.
- If it fails: stop here. Report the full tsc output and do not proceed. The slice is not done until tsc is clean.
- If tsc cannot run (missing config, environment issue, etc.): explain why, then provide:
  - The exact command to run: `npx tsc --noEmit`
  - The expected output on success: `(no output, exit code 0)`
  Do not continue the checklist — hand the verification back to the user.

### Step 2 — Modified files

List every file touched during this slice. For each one:
- Full path
- What changed
- Why it changed (the purpose, not just a description of the diff)

### Step 3 — Manual verification guide

Provide exact, sequential steps to exercise the implemented flow in the app. Steps should be concrete enough that someone who didn't write the code can follow them and confirm the feature works.

### Step 4 — Residual risks

State any known edge cases not covered, limitations, or follow-up work. If there are none, write "ninguno" — do not omit this field.

### Step 5 — TDD gate (conditional)

If the slice touched critical business logic or domain behavior: confirm tests exist and pass. If tests are missing and should exist, include that as a residual risk — do not silently skip it.

## Output

---
## Done — [nombre exacto del slice o feature]

**tsc:** ✅ 0 errores

**Archivos modificados:**
- `path/to/file.ts` — [qué cambió y por qué]

**Verificación manual:**
1. [paso exacto]
2. [paso exacto]

**Riesgos residuales:** [lista o "ninguno"]
---

The slice name in the header must match the name used in the `slice` output so there is no ambiguity when multiple slices are in progress.
