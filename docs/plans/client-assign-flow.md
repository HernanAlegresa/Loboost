# Coach → assign plan template to client (no active plan)

**Status:** planning + audit complete — **ready for implementation** (2026-05-12).  
**Scope:** product/technical spec for the assign wizard, server copy semantics, post-setup editor UX, notifications, and navigation. **No runtime code changes** are implied by this document alone.

---

## Executive summary & goals

LoBoost separates **library templates** (`plans` + `plan_weeks` / `plan_days`) from **per-client copies** (`client_plans` + `client_plan_days` + `client_plan_day_exercises`). The coach assigns a template to a roster client who has **no active plan** (or product-defined equivalent), producing an independent copy the coach can refine without mutating the library.

**Goals**

- **Predictable copy semantics** when the coach chooses a duration **N** weeks that may be less than, equal to, or greater than the template’s populated weeks (see inheritance matrix).
- **Single persistence boundary** at **end of step 2 (setup):** server action creates the `client_plans` row and copies structure; step 3 only mutates existing client-plan data (aligned with current `setupClientPlanAction` + `ViewEditClientPlanForm` / `updateClientPlanFullAction`).
- **Trustworthy navigation:** back from the post-setup editor returns to the correct surface (profile vs assign wizard), honoring `from=assign` and avoiding silent data loss (dirty exit like the library builder).
- **Discoverability:** in-app notification when a **new client** lands on the coach roster, with **deduplication**, MVP deep link into **assign**.
- **Provenance:** persist which template produced the copy using **`client_plans.plan_id`** (see ADR-0003).
- **Editor UX:** client plan editor shares the **design family** with the library (dark + lime, `FlowHeaderConfig`, sheets pattern) but remains **separate routes/components** — **never** ship client assign/edit as a single screen built on `plan-builder-form.tsx`.

**Non-goals (this slice)**

- Client-athlete execution app flows.
- Replacing `client_plan_days` with a `client_plan_weeks` hierarchy unless a dedicated migration slice explicitly does so (today’s app uses `week_number` on `client_plan_days`; older design prose in `docs/superpowers/specs/2026-04-08-loboost-design.md` described `client_plan_weeks` — treat as historical unless migrations say otherwise).

---

## User journeys

### A. Profile entry (happy path)

1. Coach opens **client profile** `/coach/clients/[id]`.
2. UI shows **Assign plan** (no active plan) — already wired in `clients/[id]/page.tsx`.
3. **Step 1 — Pick template:** `/coach/clients/[id]/assign` — list from `getCoachPlans`, incomplete badge, empty state → library CTA.
4. **Step 2 — Setup:** `/coach/clients/[id]/assign/setup?templateId=…` — name, **N** weeks, start date; **informational end date** from start + N (UI already mirrors this pattern).
5. Submit → **server action** persists copy (see matrix).
6. **Step 3 — Refine copy:** editor route (today: `/coach/clients/[id]/plan/edit?stage=2&from=assign`) — same *family* as library Stage 2, **not** `plan-builder-form`.
7. Save (when dirty) → success overlay → **profile** (current `ViewEditClientPlanForm` pushes profile after save).

### B. Notification entry (MVP)

1. Coach receives **in-app** item: “New client …” (copy TBD) with CTA **Assign plan**.
2. Deep link: `/coach/clients/[id]/assign` (or assign + query flag for analytics).
3. Continues as journey A from step 1 onward.
4. **Dedupe:** same client should not generate stacked duplicates (implementation: stable `notification_key`, upsert, or “read” state — engineering slice).

### C. Template deleted / invalid between steps 1 and 2

1. Coach selected template in step 1, left the tab, template deleted.
2. On **step 2 submit**, server validates template still exists and belongs to coach → **friendly error** → return coach to **step 1** with message (product: “Este plan ya no está en tu biblioteca”).

---

## Screen list & URLs

| Step | Route | Server / client notes |
|------|--------|------------------------|
| Client profile | `/coach/clients/[id]` | Entry: assign CTA when no active plan |
| Step 1 — Template pick | `/coach/clients/[id]/assign` | `assign/page.tsx` + `assign-plan-form.tsx` |
| Step 2 — Setup | `/coach/clients/[id]/assign/setup?templateId=<uuid>` | `assign/setup/page.tsx` + `setup-client-plan-form.tsx` |
| Step 3 — Copy editor (stage 2) | `/coach/clients/[id]/plan/edit?stage=2` (+ `from=assign` when coming from wizard) | `plan/edit/page.tsx` routes stage 1 vs 2; `view-edit-client-plan-form.tsx` |
| Step 3b — Meta (optional / other entry) | `/coach/clients/[id]/plan/edit` (no `stage=2`) | `edit-client-plan-meta-form.tsx` |

**Note on paths:** the product may speak in shorthand as `/assign/setup`; **canonical app routes** are under `/coach/clients/[id]/…` as implemented today.

---

## Inheritance matrix (N vs template weeks)

Let **T** = number of weeks that exist on the template (`plans.weeks` and/or count of `plan_weeks` rows with content). Let **N** = coach-chosen duration on setup.

| Case | Copy behavior | Empty structure | Server owns |
|------|----------------|-----------------|-------------|
| **N < T** | Copy **first N weeks in order** (`week_number` 1..N only). | Weeks N+1..T from template are **not** copied. | Filter template weeks/days where `week_number <= N`; ordering by `week_number` then `order`. |
| **N = T** | Copy **all** template weeks/days/exercises. | None. | Full graph copy for all `plan_weeks` included in query. |
| **N > T** | Copy **all** template weeks (1..T). | Weeks **T+1..N** exist as **weeks with no `client_plan_days`** until the coach adds days (7-day grid per week shows empties). | Same filter as today: `week_number <= N` **intersect** template weeks; weeks with no rows render as empty in `buildInitialWeekStates` in `view-edit-client-plan-form.tsx`. |

**Implementation note:** Current `setup-client-plan.ts` uses `planWeeks.filter((w) => w.week_number <= weeks)` — consistent with the matrix **if** template rows are 1..T contiguous. Edge case: sparse `week_number` in DB — product should confirm whether “first N weeks” means numeric week indices or **ordinal** first N rows sorted by `week_number`.

---

## Navigation matrix

| Context | Back / header `fallbackHref` | Success / forward |
|---------|------------------------------|---------------------|
| Step 1 | `/coach/clients/[id]` (`AssignPlanForm` `FlowHeaderConfig`) | Push setup with `templateId` |
| Step 2 | `/coach/clients/[id]/assign` (`SetupClientPlanForm`) | On action success → `plan/edit?stage=2&from=assign` |
| Step 3 day map (edit) | Should be **`/coach/clients/[id]`** when `from=assign`, else `/coach/clients/[id]/plan/edit` for normal edit | Check icon saves when dirty → overlay → profile |
| Step 3 day **editor** (drill-in) | Uses computed `backHref` from router context (`from=assign` vs normal edit) | Inner back returns to day map only (`onBack`) |
| Step 3 after profile “Edit plan” | Meta form → on success `plan/edit?stage=2` (no `from`) | Standard two-stage edit |

### `from=assign` and known bug (`plan/edit/page.tsx`)

- `setup-client-plan-form.tsx` on success calls `router.push` with path  
  `/coach/clients/{clientId}/plan/edit?stage=2&from=assign`.
- **Slice 3 implemented:** `plan/edit/page.tsx` now reads `from` and applies rule: if `from === 'assign'` in stage 2 editable flow, `backHref` resolves to **`/coach/clients/[id]`**; otherwise it keeps normal edit route.
- `ViewEditClientPlanForm` day-editor header now uses the same computed `backHref` (while `onBack` still returns to day map).

---

## Vertical slices (ordered)

Each slice has a **Definition of Done** and **manual QA** bullets.

### Slice 1 — Schema & types (provenance + optional alignment)

**Status:** ✅ Completed (2026-05-12)

**DoD**

- Decision recorded: use existing **`client_plans.plan_id`** as canonical template provenance.
- Architectural decision documented in [`docs/decisions/ADR-0003-client-plan-provenance-plan-id.md`](../decisions/ADR-0003-client-plan-provenance-plan-id.md).
- No new `source_plan_id` column in this slice; no migration/type-regeneration required for this decision.
- `setupClientPlanAction` explicitly writes provenance as source template id (`plan_id: selectedTemplateId`).

**Manual QA**

- Assign once → row shows correct template id.
- Delete template in DB (staging) → client row still loads; FK behavior matches spec (restrict vs set null).

### Slice 2 — Business guards (no silent multi-assign)

**Status:** ✅ Completed (2026-05-12)

**DoD**

- **Entry guard:** `/coach/clients/[id]/assign` now shows blocking UI when client has **`status = 'active'`**.
- **Server guard:** `setupClientPlanAction` no longer silently `update`s active plans to `completed`; it returns controlled error (`reason: active_plan_exists`).
- Template existence + coach ownership validated on submit; missing template now returns structured error (`reason: template_missing`) and setup UI redirects to step 1 with friendly message.

**Manual QA**

- Client with active plan cannot start wizard (or sees explicit rule).
- Two tabs open: blocked or idempotent behavior documented and tested.

### Slice 3 — Navigation & `from=assign` fix

**Status:** ✅ Completed (2026-05-12)

**DoD**

- `plan/edit/page.tsx` reads `from` and computes `backHref` for `ViewEditClientPlanForm` / meta flows per matrix.
- Day-editor header behavior aligned: fallback uses computed `backHref`; `onBack` remains day-map navigation.

**Manual QA**

- Assign → step 3 → hardware/browser back → expected screen stack.
- Assign → step 3 → header back → profile, not stuck on meta.

### Slice 4 — Dirty exit parity (“library-like”)

**Status:** ✅ Completed (2026-05-12)

**DoD**

- Leaving step 3 day-map with **unsaved** changes now shows a **bottom sheet** (z-index parity with library patterns) — discard vs stay.
- **No silent delete** of the persisted copy on navigation; only explicit cancel/delete flow may remove data (separate policy).

**Manual QA**

- Edit exercises → attempt back → sheet appears; “Stay” retains edits; “Discard” reloads server baseline or navigates per copy.

### Slice 5 — Notifications MVP (new client → assign)

**Status:** ✅ Completed (2026-05-12)

**DoD**

- Query for “new client without plan” events implemented from roster (`profiles`) + `client_plans` existence.
- Dedupe strategy implemented with stable key `assign:{coachId}:{clientId}` and client-side de-dup filter in bell.
- `CoachNotificationBell` now renders assign CTA items to `/coach/clients/[id]/assign`.
- Deep link is route-native and works on refresh/cold navigation.

**Manual QA**

- Add client → one notification (not N on refresh spam).
- Tap CTA → assign step 1 for correct client.

### Slice 6 — Polish & QA pass

**Status:** ✅ Completed (2026-05-12)

**DoD**

- End date remains **informational** (computed from start + weeks in UI; persisted `end_date` stays consistent with `calculateEndDate`).
- Spanish strings reviewed for tone.
- Client context UX polished: nombre del cliente visible y centrado en step 1, step 2 y step 3 del flujo.
- `npx tsc --noEmit` clean after TS touches.

**Manual QA**

- N < T, N = T, N > T matrix smoke tests on staging data.

---

## Risks & open engineering items

| Area | Risk | Mitigation |
|------|------|------------|
| **Data integrity** | `setupClientPlanAction` uses **delete whole `client_plans`** on partial copy failure — better than orphan rows, but still a **sharp edge** if any FK/CASCADE incomplete. | Wrap in transaction (Postgres function) or `rpc` with rollback; add integration test. |
| **Product trust** | Auto-`completed` on **all** previously active client plans during assign destroys “no duplicate assign without business rules”. | Remove or gate behind explicit “replace plan” flow + confirmation. |
| **Concurrency** | Double submit / two tabs could create two copies or race status. | Idempotency key, unique partial index on `(client_id)` where `status='active'`, or server-side advisory lock. |
| **RLS** | Any new notification table or RPC must use coach-scoped policies mirroring `client_plans` / `profiles` patterns in `supabase/migrations`. | Security review slice. |
| **Types drift** | `database.types.ts` snippet may lag migrations (e.g. `scheduled_date` on `client_plan_days` exists in migrations but verify generated types after regen). | CI check: types regen on migration change. |
| **UX parity** | Flujo cliente y biblioteca evolucionan en paralelo; cambios visuales pueden desalinearse entre iteraciones. | Mantener checklist de paridad visual por release y revisar componentes compartidos. |

**Resolved (Slice 1):** `client_plans.plan_id` is the canonical source-template FK for client copies (ADR-0003). Revisit only under ADR triggers.

---

## Key file references (audit)

| Area | Path |
|------|------|
| Step 1 page | `src/app/(coach)/coach/clients/[id]/assign/page.tsx` |
| Step 1 UI | `src/app/(coach)/coach/clients/[id]/assign/assign-plan-form.tsx` |
| Step 2 page | `src/app/(coach)/coach/clients/[id]/assign/setup/page.tsx` |
| Step 2 UI | `src/app/(coach)/coach/clients/[id]/assign/setup/setup-client-plan-form.tsx` |
| Persist copy | `src/features/plans/actions/setup-client-plan.ts` |
| End date helper | `src/features/plans/calculate-end-date.ts` |
| Day date helper | `src/features/clients/utils/training-utils.ts` (`computeDayDate`) |
| Edit router | `src/app/(coach)/coach/clients/[id]/plan/edit/page.tsx` |
| Meta editor | `src/app/(coach)/coach/clients/[id]/plan/edit/edit-client-plan-meta-form.tsx` |
| Day grid + save | `src/app/(coach)/coach/clients/[id]/plan/edit/view-edit-client-plan-form.tsx` |
| Full persist | `src/features/plans/actions/update-client-plan-full.ts` (referenced from form) |
| Add day | `src/features/plans/actions/add-client-plan-day.ts` |
| Library builder (reference only) | `src/app/(coach)/coach/library/plans/plan-builder-form.tsx` |
| Coach notifications shell | `src/components/ui/coach-notification-bell.tsx` (currently static risk/pending items) |
| Client profile entry | `src/app/(coach)/coach/clients/[id]/page.tsx` |
| Generated DB types | `src/lib/supabase/database.types.ts` (`client_plans`, `client_plan_days`) |
| Migrations (slots, columns) | `supabase/migrations/20260413120000_client_timezone_and_plan_slots.sql`, `20260508203251_fix_missing_columns_from_20260413.sql`, etc. |

---

## Appendix — Current vs desired behavior (audit highlights)

1. **Copy timing:** Already matches “persist at end of step 2” — `setupClientPlanAction` runs on setup form submit.
2. **`from=assign`:** Fixed in Slice 3 — query param is consumed and `backHref` respects assign flow.
3. **Active plan:** Fixed in Slice 2 — no more silent completion of active plan during assign; flow blocks/returns controlled error.
4. **Provenance:** Insert sets `plan_id: plan.id` (template id) and this is now the canonical policy (ADR-0003).
5. **Client editor ≠ `plan-builder-form`:** Satisfied structurally; dirty-exit sheet added in Slice 4 without reusing library runtime component.
