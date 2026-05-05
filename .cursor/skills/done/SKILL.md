---
name: done
description: Final verification checklist before declaring a slice or feature complete. Runs tsc, Layer 1 static checks (anti-patterns, security, UI states), and produces a manual verification guide. Use after implementing any slice, before reporting done to the user, and before any commit or PR.
---

# Done — Delivery Verification

## When to use

- A slice or feature has been implemented
- Before reporting "listo" to the user
- Before any commit or PR

---

## Process

### Step 1 — Run tsc (hard gate)

Run `npx tsc --noEmit` and capture the output.

- If it passes: continue to Step 2.
- If it fails: stop here. Report the full tsc output and do not proceed. The slice is not done until tsc is clean.
- If tsc cannot run (missing config, environment issue, etc.): explain why, then provide the exact command and expected output. Hand verification back to the user — do not continue the checklist.

---

### Step 2 — Layer 1 static checks (run on modified files only)

Run each grep against the files touched in this slice. A failing check is a hard stop — fix it before continuing.

Collect the list of modified files first:
```bash
git diff --name-only HEAD
```

Then run each check scoped to those files:

#### 2a — Hardcoded colors
```bash
grep -n '#[0-9A-Fa-f]\{3,6\}' <modified_files>
```
**Pass:** 0 hits.
**Fail:** Any hit that is not inside a comment or a migration SQL file. Fix: replace with the appropriate `var(--color-*)` token or Tailwind class from `globals.css`.

#### 2b — Unjustified inline styles
```bash
grep -n 'style={{' <modified_files>
```
**Pass:** Every hit meets both conditions: (1) the value is dynamic — computed at runtime from JS and cannot be expressed as a static Tailwind class — and (2) there is an inline comment on the same line or the line above explaining why. Safe-area constants from `@/lib/ui/safe-area` are pre-approved and require no comment.
**Fail:** Any `style={{}}` containing a static color, spacing, font-size, or border-radius value, or any dynamic value with no justification comment. Fix: convert to Tailwind, or add the justification comment if truly dynamic.

#### 2c — Broad queries
```bash
grep -n "\.select('\*')\|\.select(\"*\")" <modified_files>
```
**Pass:** 0 hits, or every hit has an inline comment on the same line explaining why `*` is justified (e.g., `// all columns needed for X transform`).
**Fail:** Any `.select('*')` with no justification comment. Fix: enumerate only the columns the component actually uses, or add the justification comment if all columns are genuinely needed.

#### 2g — Queries without explicit ownership filter
```bash
grep -n "\.from('" <modified_files>
```
For each hit, confirm the query chain includes at least one `.eq()` or `.match()` that binds the result to the caller's data (e.g., `.eq('client_id', clientId)` or `.eq('coach_id', user.id)`).

**Pass:** Every `.from()` call is followed by an explicit ownership filter.
**Fail:** Any query that relies solely on RLS with no explicit filter. Fix: add the `.eq()` filter — RLS is not a substitute for readable, explicit ownership (see backend skill Step 5).

#### 2d — SECURITY DEFINER
```bash
grep -ni 'security definer' <modified_files>
```
**Pass:** 0 hits.
**Fail:** Any hit in a new or modified function. This requires escalation — do not proceed without explicit approval and the full checklist from the backend skill.

#### 2e — Service role
```bash
grep -ni 'service.role\|serviceRole\|SERVICE_ROLE' <modified_files>
```
**Pass:** 0 hits.
**Fail:** Any hit. Service role is prohibited in feature code — escalate.

#### 2f — UI states (conditional — only if slice touched React components)

For each new or substantially modified `.tsx` component in the slice, confirm all three states are handled:

```bash
# Loading state
grep -n 'skeleton\|Skeleton\|isPending\|isLoading\|loading' <modified_tsx_files>

# Empty state
grep -n 'length === 0\|\.length === 0\|empty\|Empty\|vacío\|sin ' <modified_tsx_files>

# Error state
grep -n 'error\|Error' <modified_tsx_files>
```

**Pass:** Each state meets its definition:
- **Loading** — renders a visible skeleton or spinner that occupies the same space as the loaded content. A `null` return or a blank div does not count.
- **Empty** — renders a message plus an actionable element (button, link, or CTA). A message alone with no action does not count.
- **Error** — renders an error message plus a recovery path (retry button, back navigation, or contact action). Silent failure or a bare error string does not count.

**Fail:** A state has zero hits, or its handler does not meet the definition above. Either fix the handler or document why the state is structurally impossible for this component (e.g., data is guaranteed non-empty by a parent gate).

---

### Step 3 — Modified files

List every file touched during this slice. For each one:
- Full path
- What changed
- Why it changed (the purpose, not just a description of the diff)

---

### Step 4 — Manual verification guide

Provide exact, sequential steps to exercise the implemented flow in the app. Steps must be concrete enough that someone who didn't write the code can follow them and confirm the feature works — including loading, empty, and error states where reachable.

---

### Step 5 — Residual risks

State any known edge cases not covered, limitations, or follow-up work. If there are none, write "ninguno" — do not omit this field.

---

### Step 6 — TDD gate (conditional)

If the slice touched critical business logic or domain behavior: confirm tests exist and pass. If tests are missing and should exist, include that as a residual risk — do not silently skip it.

---

## Output

---
## Done — [nombre exacto del slice o feature]

**tsc:** ✅ 0 errores

**Layer 1 — Static checks (archivos del slice):**
- Hardcoded colors: ✅ 0 hits
- Inline styles no justificados: ✅ 0 hits / [N] justificados con comentario
- Broad queries (.select('*')): ✅ 0 hits / [N] justificados con comentario
- Queries sin filtro explícito: ✅ todas con .eq() / ❌ [lista]
- SECURITY DEFINER: ✅ 0 hits
- Service role: ✅ 0 hits
- UI states: loading visible ✅ / empty con acción ✅ / error con recovery ✅

**Archivos modificados:**
- `path/to/file.ts` — [qué cambió y por qué]

**Verificación manual:**
1. [paso exacto]
2. [paso exacto]

**Riesgos residuales:** [lista o "ninguno"]
---

The slice name in the header must match the name used in the `slice` output so there is no ambiguity when multiple slices are in progress.
