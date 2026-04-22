# Foundation Data Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the LoBoost data model to support per-week plan variation, rep ranges, reps actually performed, and RPE per session — without breaking existing data.

**Architecture:** Three Supabase migrations add the new columns/tables; existing data is migrated in-place. Backend actions (plan creation, plan assignment, set logging, session completion) are updated to read/write the new fields. All UI changes are deferred to the UI plan (`2026-04-20-ui-builder-training-progress.md`).

**Tech Stack:** Supabase (PostgreSQL), Next.js Server Actions, Zod, TypeScript, `@supabase/supabase-js`

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260420000001_plan_weeks.sql` |
| Create | `supabase/migrations/20260420000002_reps_range.sql` |
| Create | `supabase/migrations/20260420000003_session_tracking.sql` |
| Modify | `src/features/plans/schemas.ts` |
| Modify | `src/features/plans/plan-builder-persist.ts` |
| Modify | `src/features/plans/actions/create-plan.ts` (minor) |
| Modify | `src/features/plans/actions/update-plan-full.ts` (minor) |
| Modify | `src/features/plans/actions/assign-plan.ts` |
| Modify | `src/features/training/schemas.ts` |
| Modify | `src/features/training/actions/complete-set.ts` |
| Modify | `src/features/training/actions/complete-session.ts` |
| Modify | `src/features/plans/__tests__/schemas.test.ts` |
| Modify | `src/features/training/__tests__/schemas.test.ts` |
| Regenerate | `src/types/database.ts` (via Supabase CLI) |

---

## Task 1: Migration — plan_weeks table + plan_days.plan_week_id

**Why:** The current `plan_days` table has no week concept — all weeks are identical. We add a `plan_weeks` join table so each week in a plan can have independent days and exercises.

**Files:**
- Create: `supabase/migrations/20260420000001_plan_weeks.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- =============================================
-- plan_weeks: semanas independientes por plan
-- =============================================
create table public.plan_weeks (
  id          uuid default gen_random_uuid() primary key,
  plan_id     uuid references public.plans(id) on delete cascade not null,
  week_number integer not null check (week_number >= 1 and week_number <= 12),
  week_name   text,
  week_type   text not null default 'normal'
              check (week_type in ('normal', 'deload', 'peak', 'test')),
  created_at  timestamptz default now() not null,
  unique (plan_id, week_number)
);

alter table public.plan_weeks enable row level security;

create policy "plan_weeks: coach manages own"
  on public.plan_weeks for all
  using (
    exists (
      select 1 from public.plans
      where plans.id = plan_weeks.plan_id
        and plans.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plans
      where plans.id = plan_weeks.plan_id
        and plans.coach_id = auth.uid()
    )
  );

-- Agregar plan_week_id a plan_days (nullable primero para migrar datos)
alter table public.plan_days
  add column plan_week_id uuid references public.plan_weeks(id) on delete cascade;

-- Para cada plan existente, crear un plan_week para la semana 1
insert into public.plan_weeks (id, plan_id, week_number, week_name, week_type)
select gen_random_uuid(), p.id, 1, 'Semana 1', 'normal'
from public.plans p;

-- Para planes con más de 1 semana, crear las semanas restantes
do $$
declare
  plan_rec record;
  wnum     integer;
begin
  for plan_rec in select id, weeks from public.plans where weeks > 1 loop
    for wnum in 2..plan_rec.weeks loop
      insert into public.plan_weeks (id, plan_id, week_number, week_name, week_type)
      values (
        gen_random_uuid(),
        plan_rec.id,
        wnum,
        'Semana ' || wnum,
        'normal'
      );
    end loop;
  end loop;
end $$;

-- Asignar plan_week_id (semana 1) a todos los plan_days existentes
update public.plan_days pd
set plan_week_id = (
  select pw.id
  from public.plan_weeks pw
  where pw.plan_id = pd.plan_id
    and pw.week_number = 1
);

-- Ahora que los datos están migrados, hacer la columna NOT NULL
alter table public.plan_days
  alter column plan_week_id set not null;

-- Agregar unique constraint: un plan_day no puede repetir día en la misma semana
alter table public.plan_days
  add constraint plan_days_week_day_unique unique (plan_week_id, day_of_week);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without errors. If there are existing plans with duplicate `day_of_week` values in the same plan, the unique constraint will fail — resolve by inspecting data first.

- [ ] **Step 3: Verify migration**

```bash
npx supabase db push --dry-run
```

Check that `plan_weeks` table exists and `plan_days.plan_week_id` is NOT NULL in the remote schema.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260420000001_plan_weeks.sql
git commit -m "feat(db): add plan_weeks table + plan_days.plan_week_id for per-week variation"
```

---

## Task 2: Migration — reps_min + reps_max

**Why:** `reps integer` only supports fixed rep counts. Replacing with `reps_min` + `reps_max` allows ranges like 8–10 (when min ≠ max) or fixed reps (when min = max) or no reps at all (cardio).

**Files:**
- Create: `supabase/migrations/20260420000002_reps_range.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- =============================================
-- plan_day_exercises: reps → reps_min + reps_max
-- =============================================
alter table public.plan_day_exercises
  add column reps_min integer check (reps_min >= 1),
  add column reps_max integer check (reps_max >= 1);

-- Migrar datos existentes: reps fijo → min = max = reps
update public.plan_day_exercises
set reps_min = reps,
    reps_max = reps
where reps is not null;

alter table public.plan_day_exercises drop column reps;

-- Agregar constraint: si reps_max está definido, debe ser >= reps_min
alter table public.plan_day_exercises
  add constraint plan_day_exercises_reps_check
  check (reps_max is null or reps_min is null or reps_max >= reps_min);

-- =============================================
-- client_plan_day_exercises: igual
-- =============================================
alter table public.client_plan_day_exercises
  add column reps_min integer check (reps_min >= 1),
  add column reps_max integer check (reps_max >= 1);

update public.client_plan_day_exercises
set reps_min = reps,
    reps_max = reps
where reps is not null;

alter table public.client_plan_day_exercises drop column reps;

alter table public.client_plan_day_exercises
  add constraint client_plan_day_exercises_reps_check
  check (reps_max is null or reps_min is null or reps_max >= reps_min);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420000002_reps_range.sql
git commit -m "feat(db): replace reps integer with reps_min + reps_max for rep ranges"
```

---

## Task 3: Migration — session_sets.reps_performed + sessions.rpe + sessions.notes

**Why:** Without `reps_performed`, we can't know if a client actually completed 8 vs 6 reps. `rpe` (1–10) lets the coach see perceived effort per session. `notes` lets the client leave a comment.

**Files:**
- Create: `supabase/migrations/20260420000003_session_tracking.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- =============================================
-- session_sets: reps_performed
-- =============================================
alter table public.session_sets
  add column reps_performed integer check (reps_performed >= 0);

-- =============================================
-- sessions: RPE (1-10) + notas del cliente
-- =============================================
alter table public.sessions
  add column rpe   smallint check (rpe >= 1 and rpe <= 10),
  add column notes text;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420000003_session_tracking.sql
git commit -m "feat(db): add reps_performed to session_sets, rpe and notes to sessions"
```

---

## Task 4: Regenerate TypeScript types

**Why:** `src/types/database.ts` is auto-generated from the DB schema. After three migrations, it must be regenerated so the rest of the codebase has correct types.

**Files:**
- Regenerate: `src/types/database.ts`

- [ ] **Step 1: Run type generation**

```bash
npx supabase gen types typescript --project-id zsczvjsqkgmvouzcjcvv > src/types/database.ts
```

- [ ] **Step 2: Verify new types exist**

Open `src/types/database.ts` and confirm:
- `plan_weeks` table type exists with `week_number`, `week_name`, `week_type`
- `plan_day_exercises` has `reps_min` and `reps_max`, no `reps`
- `client_plan_day_exercises` has `reps_min` and `reps_max`, no `reps`
- `session_sets` has `reps_performed`
- `sessions` has `rpe` and `notes`

- [ ] **Step 3: Check TypeScript compiles (will have errors — that's expected)**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: errors about `reps` being used but not defined — these will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "chore(types): regenerate database.ts after migrations"
```

---

## Task 5: Update plan schemas (Zod)

**Why:** `planDayExerciseSchema` still uses `reps`. `planBuilderPayloadSchema` uses `days[]` (no weeks). Both must be updated to reflect the new data model.

**Files:**
- Modify: `src/features/plans/schemas.ts`

- [ ] **Step 1: Write failing tests for new schemas**

Replace the content of `src/features/plans/__tests__/schemas.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest'
import {
  planDayExerciseSchema,
  planBuilderPayloadSchema,
  updateClientPlanExerciseSchema,
} from '../schemas'

const EXERCISE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('planDayExerciseSchema', () => {
  it('accepts fixed reps (repsMin = repsMax)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 8,
      repsMax: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts rep range (repsMin < repsMax)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with durationSeconds and no reps', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 1,
      durationSeconds: 60,
    })
    expect(result.success).toBe(true)
  })

  it('accepts exercise with neither reps nor duration (AMRAP / coach decides)', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects repsMax < repsMin at schema level when both provided', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: EXERCISE_ID,
      order: 1,
      sets: 3,
      repsMin: 10,
      repsMax: 8,
    })
    expect(result.success).toBe(false)
  })
})

describe('planBuilderPayloadSchema — multi-week structure', () => {
  const validWeek = (weekNumber: number) => ({
    weekNumber,
    weekName: `Semana ${weekNumber}`,
    weekType: 'normal',
    days: [
      {
        dayOfWeek: 1,
        exercises: [
          { exerciseId: EXERCISE_ID, order: 1, sets: 3, repsMin: 8, repsMax: 10 },
        ],
      },
    ],
  })

  it('accepts a plan with 2 independent weeks', () => {
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan Fuerza',
      weeks: 2,
      planWeeks: [validWeek(1), validWeek(2)],
    })
    expect(result.success).toBe(true)
  })

  it('rejects plan with planWeeks count different from weeks', () => {
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan Fuerza',
      weeks: 3,
      planWeeks: [validWeek(1)],
    })
    expect(result.success).toBe(false)
  })

  it('accepts deload week type', () => {
    const week = { ...validWeek(1), weekType: 'deload' }
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan',
      weeks: 1,
      planWeeks: [week],
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown weekType', () => {
    const week = { ...validWeek(1), weekType: 'rest' }
    const result = planBuilderPayloadSchema.safeParse({
      name: 'Plan',
      weeks: 1,
      planWeeks: [week],
    })
    expect(result.success).toBe(false)
  })
})

describe('updateClientPlanExerciseSchema', () => {
  it('accepts repsMin update', () => {
    const result = updateClientPlanExerciseSchema.safeParse({ repsMin: 6 })
    expect(result.success).toBe(true)
  })

  it('accepts repsMax update', () => {
    const result = updateClientPlanExerciseSchema.safeParse({ repsMin: 6, repsMax: 8 })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/features/plans/__tests__/schemas.test.ts
```

Expected: failures on `planDayExerciseSchema` (no `repsMin`) and `planBuilderPayloadSchema` (no `planWeeks`).

- [ ] **Step 3: Replace `src/features/plans/schemas.ts` with updated version**

```typescript
import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(12),
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(12).optional(),
})

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>

export const planDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  order: z.coerce.number().int().min(1),
})

export type PlanDayInput = z.infer<typeof planDaySchema>

export const planDayExerciseSchema = z
  .object({
    exerciseId: z.string().uuid(),
    order: z.coerce.number().int().min(1),
    sets: z.coerce.number().int().min(1),
    repsMin: z.coerce.number().int().min(1).optional(),
    repsMax: z.coerce.number().int().min(1).optional(),
    durationSeconds: z.coerce.number().int().min(1).optional(),
    restSeconds: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (d) => d.repsMax == null || d.repsMin == null || d.repsMax >= d.repsMin,
    { message: 'El rango máximo de reps debe ser mayor o igual al mínimo' }
  )

export type PlanDayExerciseInput = z.infer<typeof planDayExerciseSchema>

export const assignPlanSchema = z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().date(),
})

export type AssignPlanInput = z.infer<typeof assignPlanSchema>

export const planBuilderDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  exercises: z.array(planDayExerciseSchema).min(1, 'Cada día debe tener al menos un ejercicio'),
})

export type PlanBuilderDayInput = z.infer<typeof planBuilderDaySchema>

export const planBuilderWeekSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(12),
  weekName: z.string().optional(),
  weekType: z.enum(['normal', 'deload', 'peak', 'test']).default('normal'),
  days: z.array(planBuilderDaySchema).min(0),
})

export type PlanBuilderWeekInput = z.infer<typeof planBuilderWeekSchema>

export const planBuilderPayloadSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    description: z.string().optional(),
    weeks: z.coerce.number().int().min(1).max(12),
    planWeeks: z
      .array(planBuilderWeekSchema)
      .min(1, 'Debe haber al menos una semana configurada'),
  })
  .refine((d) => d.planWeeks.length === d.weeks, {
    message: 'La cantidad de semanas configuradas debe coincidir con el total de semanas del plan',
    path: ['planWeeks'],
  })

export type PlanBuilderPayloadInput = z.infer<typeof planBuilderPayloadSchema>

export const updateClientPlanExerciseSchema = z.object({
  sets: z.coerce.number().int().min(1).optional(),
  repsMin: z.coerce.number().int().min(1).optional(),
  repsMax: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(1).optional(),
})

export type UpdateClientPlanExerciseInput = z.infer<typeof updateClientPlanExerciseSchema>
```

- [ ] **Step 4: Run tests again — all should pass**

```bash
npx vitest run src/features/plans/__tests__/schemas.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/plans/schemas.ts src/features/plans/__tests__/schemas.test.ts
git commit -m "feat(plans): update schemas for rep ranges and multi-week structure"
```

---

## Task 6: Update plan-builder-persist.ts

**Why:** `validatePlanBuilderForCoach` and `insertPlanDayTree` use the old schema (flat `days[]`, single `reps`). They must be updated for the new `planWeeks[]` / `reps_min` + `reps_max` structure. `deletePlanDayTree` can now be simplified since `ON DELETE CASCADE` handles child rows.

**Files:**
- Modify: `src/features/plans/plan-builder-persist.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  planBuilderPayloadSchema,
  planDayExerciseSchema,
  planDaySchema,
  type PlanBuilderPayloadInput,
} from '@/features/plans/schemas'
import type { Database } from '@/types/database'

export type ValidatedPlanBuilder = {
  payload: PlanBuilderPayloadInput
}

/** Parse JSON + Zod + exercise type rules (strength requires repsMin, cardio requires durationSeconds). */
export async function validatePlanBuilderForCoach(
  supabase: SupabaseClient<Database>,
  coachUserId: string,
  parsedJson: unknown
): Promise<{ ok: true; data: ValidatedPlanBuilder } | { ok: false; error: string }> {
  const payloadResult = planBuilderPayloadSchema.safeParse(parsedJson)
  if (!payloadResult.success) {
    return { ok: false, error: payloadResult.error.issues[0].message }
  }
  const payload = payloadResult.data

  // Validate week_number sequence: must be 1..N in order
  const weekNumbers = payload.planWeeks.map((w) => w.weekNumber)
  for (let i = 0; i < weekNumbers.length; i++) {
    if (weekNumbers[i] !== i + 1) {
      return { ok: false, error: `Las semanas deben estar numeradas del 1 al ${payload.weeks}` }
    }
  }

  // Collect all exercise IDs across all weeks for a single DB lookup
  const allExerciseIds = payload.planWeeks
    .flatMap((w) => w.days)
    .flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const uniqueExerciseIds = [...new Set(allExerciseIds)]

  if (uniqueExerciseIds.length === 0) {
    return { ok: false, error: 'El plan debe tener al menos un ejercicio' }
  }

  const { data: exerciseRows, error: exFetchError } = await supabase
    .from('exercises')
    .select('id, type')
    .eq('coach_id', coachUserId)
    .in('id', uniqueExerciseIds)

  if (exFetchError || !exerciseRows || exerciseRows.length !== uniqueExerciseIds.length) {
    return { ok: false, error: 'Ejercicio inválido o no pertenece a tu biblioteca' }
  }

  const typeById = new Map(exerciseRows.map((r) => [r.id, r.type as 'strength' | 'cardio']))

  for (const week of payload.planWeeks) {
    const dayNumbers = week.days.map((d) => d.dayOfWeek)
    if (new Set(dayNumbers).size !== dayNumbers.length) {
      return {
        ok: false,
        error: `Semana ${week.weekNumber}: no podés repetir el mismo día de la semana`,
      }
    }

    for (const day of week.days) {
      for (const exercise of day.exercises) {
        const exResult = planDayExerciseSchema.safeParse(exercise)
        if (!exResult.success) {
          return { ok: false, error: 'Datos de ejercicio inválidos' }
        }
        const t = typeById.get(exResult.data.exerciseId)
        if (t === 'strength') {
          if (exResult.data.repsMin == null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en fuerza, las repeticiones mínimas son requeridas`,
            }
          }
          if (exResult.data.durationSeconds != null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en fuerza, no uses duración (usá repeticiones)`,
            }
          }
        }
        if (t === 'cardio') {
          if (exResult.data.durationSeconds == null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en cardio, la duración (segundos) es requerida`,
            }
          }
          if (exResult.data.repsMin != null) {
            return {
              ok: false,
              error: `Semana ${week.weekNumber}: en cardio, no uses repeticiones (usá duración)`,
            }
          }
        }
      }
    }
  }

  return { ok: true, data: { payload } }
}

/** Insert plan_weeks → plan_days → plan_day_exercises for an existing plan row. */
export async function insertPlanWeekTree(
  supabase: SupabaseClient<Database>,
  planId: string,
  planWeeks: PlanBuilderPayloadInput['planWeeks']
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const week of planWeeks) {
    const { data: planWeek, error: weekError } = await supabase
      .from('plan_weeks')
      .insert({
        plan_id: planId,
        week_number: week.weekNumber,
        week_name: week.weekName ?? `Semana ${week.weekNumber}`,
        week_type: week.weekType,
      })
      .select('id')
      .single()

    if (weekError || !planWeek) {
      return { ok: false, error: 'Error al crear la semana del plan' }
    }

    const sortedDays = [...week.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const dayResult = planDaySchema.safeParse({ dayOfWeek: day.dayOfWeek, order: i + 1 })
      if (!dayResult.success) {
        return { ok: false, error: 'Datos de día inválidos' }
      }

      const { data: planDay, error: dayError } = await supabase
        .from('plan_days')
        .insert({
          plan_id: planId,
          plan_week_id: planWeek.id,
          day_of_week: dayResult.data.dayOfWeek,
          order: dayResult.data.order,
        })
        .select('id')
        .single()

      if (dayError || !planDay) {
        return { ok: false, error: 'Error al crear el día del plan' }
      }

      const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order)

      for (const exercise of sortedExercises) {
        const exResult = planDayExerciseSchema.safeParse(exercise)
        if (!exResult.success) {
          return { ok: false, error: 'Datos de ejercicio inválidos' }
        }

        const { error: exError } = await supabase.from('plan_day_exercises').insert({
          plan_day_id: planDay.id,
          exercise_id: exResult.data.exerciseId,
          order: exResult.data.order,
          sets: exResult.data.sets,
          reps_min: exResult.data.repsMin ?? null,
          reps_max: exResult.data.repsMax ?? null,
          duration_seconds: exResult.data.durationSeconds ?? null,
          rest_seconds: exResult.data.restSeconds ?? null,
        })

        if (exError) {
          return { ok: false, error: 'Error al agregar ejercicio al plan' }
        }
      }
    }
  }

  return { ok: true }
}

/**
 * Delete all plan_weeks for a plan.
 * Cascades to plan_days and plan_day_exercises via FK ON DELETE CASCADE.
 */
export async function deletePlanWeekTree(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('plan_weeks').delete().eq('plan_id', planId)
  if (error) return { ok: false, error: 'Error al actualizar semanas del plan' }
  return { ok: true }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "plan-builder-persist"
```

Expected: no errors for this file (other files may still have errors from unfinished tasks).

- [ ] **Step 3: Commit**

```bash
git add src/features/plans/plan-builder-persist.ts
git commit -m "feat(plans): rewrite plan-builder-persist for multi-week and reps ranges"
```

---

## Task 7: Update create-plan.ts and update-plan-full.ts

**Why:** Both actions delegate to `plan-builder-persist`. They reference `sortedDays` and `insertPlanDayTree` / `deletePlanDayTree` which no longer exist — must be updated to use the new API.

**Files:**
- Modify: `src/features/plans/actions/create-plan.ts`
- Modify: `src/features/plans/actions/update-plan-full.ts`

- [ ] **Step 1: Update `create-plan.ts`**

Replace the file with:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  insertPlanWeekTree,
  validatePlanBuilderForCoach,
} from '@/features/plans/plan-builder-persist'

export type CreatePlanState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function createPlanAction(
  _prevState: CreatePlanState,
  formData: FormData
): Promise<CreatePlanState> {
  const payloadRaw = formData.get('planPayload')
  if (typeof payloadRaw !== 'string') {
    return { success: false, error: 'Payload inválido' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(payloadRaw)
  } catch {
    return { success: false, error: 'Payload inválido (JSON)' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const validated = await validatePlanBuilderForCoach(supabase, user.id, parsedJson)
  if (!validated.ok) return { success: false, error: validated.error }
  const { payload } = validated.data

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      coach_id: user.id,
      name: payload.name,
      description: payload.description ?? null,
      weeks: payload.weeks,
    })
    .select('id')
    .single()

  if (planError || !plan) return { success: false, error: 'Error al crear el plan' }

  const inserted = await insertPlanWeekTree(supabase, plan.id, payload.planWeeks)
  if (!inserted.ok) {
    await supabase.from('plans').delete().eq('id', plan.id).eq('coach_id', user.id)
    return { success: false, error: inserted.error }
  }

  revalidatePath('/coach/library/plans')
  revalidatePath(`/coach/library/plans/${plan.id}`)

  return { success: true, planId: plan.id }
}
```

- [ ] **Step 2: Update `update-plan-full.ts`**

Replace the file with:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  deletePlanWeekTree,
  insertPlanWeekTree,
  validatePlanBuilderForCoach,
} from '@/features/plans/plan-builder-persist'

export type UpdatePlanFullState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function updatePlanFullAction(
  _prev: UpdatePlanFullState,
  formData: FormData
): Promise<UpdatePlanFullState> {
  const planIdRaw = formData.get('planId')
  if (typeof planIdRaw !== 'string' || planIdRaw.length < 10) {
    return { success: false, error: 'Plan inválido' }
  }
  const planId = planIdRaw

  const payloadRaw = formData.get('planPayload')
  if (typeof payloadRaw !== 'string') {
    return { success: false, error: 'Payload inválido' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(payloadRaw)
  } catch {
    return { success: false, error: 'Payload inválido (JSON)' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  const { data: owned, error: ownErr } = await supabase
    .from('plans')
    .select('id')
    .eq('id', planId)
    .eq('coach_id', user.id)
    .single()

  if (ownErr || !owned) return { success: false, error: 'Plan no encontrado' }

  const validated = await validatePlanBuilderForCoach(supabase, user.id, parsedJson)
  if (!validated.ok) return { success: false, error: validated.error }
  const { payload } = validated.data

  const { error: metaErr } = await supabase
    .from('plans')
    .update({
      name: payload.name,
      description: payload.description ?? null,
      weeks: payload.weeks,
    })
    .eq('id', planId)
    .eq('coach_id', user.id)

  if (metaErr) return { success: false, error: 'Error al actualizar el plan' }

  const del = await deletePlanWeekTree(supabase, planId)
  if (!del.ok) return { success: false, error: del.error }

  const ins = await insertPlanWeekTree(supabase, planId, payload.planWeeks)
  if (!ins.ok) return { success: false, error: ins.error }

  revalidatePath('/coach/library/plans')
  revalidatePath(`/coach/library/plans/${planId}`)
  revalidatePath(`/coach/library/plans/${planId}/edit`)

  return { success: true, planId }
}
```

- [ ] **Step 3: Check TypeScript for these two files**

```bash
npx tsc --noEmit 2>&1 | grep -E "create-plan|update-plan-full"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/plans/actions/create-plan.ts src/features/plans/actions/update-plan-full.ts
git commit -m "feat(plans): update create and update actions for multi-week builder"
```

---

## Task 8: Update assign-plan.ts

**Why:** `assignPlanAction` currently reads `plan_days` directly and repeats them for each week. It must now read `plan_weeks → plan_days` and use each week's actual days/exercises.

**Files:**
- Modify: `src/features/plans/actions/assign-plan.ts`

- [ ] **Step 1: Replace the file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateEndDate } from '@/features/plans/calculate-end-date'
import { assignPlanSchema } from '@/features/plans/schemas'

export type AssignPlanState =
  | { success: true; clientPlanId: string }
  | { success: false; error: string }
  | null

export async function assignPlanAction(
  _prevState: AssignPlanState,
  formData: FormData
): Promise<AssignPlanState> {
  const raw = {
    clientId: formData.get('clientId'),
    planId: formData.get('planId'),
    startDate: formData.get('startDate'),
  }

  const result = assignPlanSchema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user: coachUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !coachUser) return { success: false, error: 'No autenticado' }

  const { data: clientProfile, error: clientError } = await supabase
    .from('profiles')
    .select('id, coach_id, role')
    .eq('id', result.data.clientId)
    .single()

  if (clientError || !clientProfile) return { success: false, error: 'Cliente no encontrado' }
  if (clientProfile.role !== 'client' || clientProfile.coach_id !== coachUser.id) {
    return { success: false, error: 'Cliente no válido' }
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select(`
      id, name, weeks,
      plan_weeks (
        id, week_number,
        plan_days (
          id, day_of_week, order,
          plan_day_exercises (
            id, exercise_id, order, sets, reps_min, reps_max, duration_seconds, rest_seconds
          )
        )
      )
    `)
    .eq('id', result.data.planId)
    .eq('coach_id', coachUser.id)
    .single()

  if (planError || !plan) return { success: false, error: 'Plan no encontrado' }

  const planWeeks = (plan.plan_weeks ?? []) as Array<{
    id: string
    week_number: number
    plan_days: Array<{
      id: string
      day_of_week: number
      order: number
      plan_day_exercises: Array<{
        id: string
        exercise_id: string
        order: number
        sets: number
        reps_min: number | null
        reps_max: number | null
        duration_seconds: number | null
        rest_seconds: number | null
      }>
    }>
  }>

  if (planWeeks.length === 0) {
    return { success: false, error: 'Este plan no tiene semanas configuradas' }
  }

  const startDate = new Date(result.data.startDate)
  const endDate = calculateEndDate(startDate, plan.weeks)

  await supabase
    .from('client_plans')
    .update({ status: 'completed' })
    .eq('client_id', result.data.clientId)
    .eq('coach_id', coachUser.id)
    .eq('status', 'active')

  const { data: clientPlan, error: clientPlanError } = await supabase
    .from('client_plans')
    .insert({
      client_id: result.data.clientId,
      coach_id: coachUser.id,
      plan_id: plan.id,
      name: plan.name,
      weeks: plan.weeks,
      start_date: result.data.startDate,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    })
    .select('id')
    .single()

  if (clientPlanError || !clientPlan) {
    return { success: false, error: 'Error al asignar el plan' }
  }

  const sortedWeeks = [...planWeeks].sort((a, b) => a.week_number - b.week_number)

  for (const week of sortedWeeks) {
    const sortedDays = [...(week.plan_days ?? [])].sort((a, b) => a.order - b.order)

    for (const day of sortedDays) {
      const { data: clientDay, error: dayError } = await supabase
        .from('client_plan_days')
        .insert({
          client_plan_id: clientPlan.id,
          week_number: week.week_number,
          day_of_week: day.day_of_week,
          order: day.order,
        })
        .select('id')
        .single()

      if (dayError || !clientDay) {
        return { success: false, error: 'Error al copiar los días del plan' }
      }

      const sortedExercises = [...(day.plan_day_exercises ?? [])].sort(
        (a, b) => a.order - b.order
      )

      for (const exercise of sortedExercises) {
        const { error: exError } = await supabase
          .from('client_plan_day_exercises')
          .insert({
            client_plan_day_id: clientDay.id,
            exercise_id: exercise.exercise_id,
            order: exercise.order,
            sets: exercise.sets,
            reps_min: exercise.reps_min ?? null,
            reps_max: exercise.reps_max ?? null,
            duration_seconds: exercise.duration_seconds ?? null,
            rest_seconds: exercise.rest_seconds ?? null,
          })

        if (exError) {
          return { success: false, error: 'Error al copiar ejercicios del plan' }
        }
      }
    }
  }

  return { success: true, clientPlanId: clientPlan.id }
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "assign-plan"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/plans/actions/assign-plan.ts
git commit -m "feat(plans): update assignPlanAction to use per-week plan structure"
```

---

## Task 9: Update training schemas + complete-set.ts

**Why:** `completeSetSchema` doesn't include `repsPerformed`. The set completion action doesn't write it to the DB.

**Files:**
- Modify: `src/features/training/schemas.ts`
- Modify: `src/features/training/actions/complete-set.ts`
- Modify: `src/features/training/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing tests**

Replace `src/features/training/__tests__/schemas.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest'
import { completeSetSchema, completeSessionSchema } from '../schemas'

const SESSION_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const EXERCISE_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

describe('completeSetSchema', () => {
  it('accepts strength set with weight and reps', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      weightKg: 80,
      repsPerformed: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio set with durationSeconds only', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      durationSeconds: 60,
    })
    expect(result.success).toBe(true)
  })

  it('accepts set with only setNumber (minimal completion)', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects repsPerformed = 0', () => {
    const result = completeSetSchema.safeParse({
      sessionId: SESSION_ID,
      clientPlanDayExerciseId: EXERCISE_ID,
      setNumber: 1,
      repsPerformed: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('completeSessionSchema', () => {
  it('accepts session completion with RPE', () => {
    const result = completeSessionSchema.safeParse({
      sessionId: SESSION_ID,
      rpe: 8,
    })
    expect(result.success).toBe(true)
  })

  it('accepts session without RPE', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID })
    expect(result.success).toBe(true)
  })

  it('rejects RPE = 0', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID, rpe: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects RPE = 11', () => {
    const result = completeSessionSchema.safeParse({ sessionId: SESSION_ID, rpe: 11 })
    expect(result.success).toBe(false)
  })

  it('accepts notes', () => {
    const result = completeSessionSchema.safeParse({
      sessionId: SESSION_ID,
      rpe: 7,
      notes: 'Sentí las piernas pesadas',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/features/training/__tests__/schemas.test.ts
```

Expected: failures on `repsPerformed` and `completeSessionSchema` not existing.

- [ ] **Step 3: Update `src/features/training/schemas.ts`**

```typescript
import { z } from 'zod'

export const startSessionSchema = z.object({
  clientPlanDayId: z.string().uuid(),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>

export const completeSetSchema = z.object({
  sessionId: z.string().uuid(),
  clientPlanDayExerciseId: z.string().uuid(),
  setNumber: z.coerce.number().int().min(1),
  repsPerformed: z.coerce.number().int().min(1).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
})

export type CompleteSetInput = z.infer<typeof completeSetSchema>

export const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
})

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
```

- [ ] **Step 4: Update `src/features/training/actions/complete-set.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { completeSetSchema } from '@/features/training/schemas'

export async function completeSetAction(formData: FormData) {
  const raw = {
    sessionId: formData.get('sessionId'),
    clientPlanDayExerciseId: formData.get('clientPlanDayExerciseId'),
    setNumber: formData.get('setNumber'),
    repsPerformed: formData.get('repsPerformed') || undefined,
    weightKg: formData.get('weightKg') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
  }

  const result = completeSetSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('session_sets')
    .upsert(
      {
        session_id: result.data.sessionId,
        client_plan_day_exercise_id: result.data.clientPlanDayExerciseId,
        set_number: result.data.setNumber,
        reps_performed: result.data.repsPerformed ?? null,
        weight_kg: result.data.weightKg ?? null,
        duration_seconds: result.data.durationSeconds ?? null,
        completed: true,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,client_plan_day_exercise_id,set_number' }
    )

  if (error) return { error: 'Error al registrar la serie' }

  return { success: true }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/features/training/__tests__/schemas.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/training/schemas.ts src/features/training/actions/complete-set.ts src/features/training/__tests__/schemas.test.ts
git commit -m "feat(training): add repsPerformed to set logging + completeSessionSchema with RPE"
```

---

## Task 10: Update complete-session.ts with RPE + notes

**Why:** `completeSessionAction` doesn't accept or persist RPE or session notes.

**Files:**
- Modify: `src/features/training/actions/complete-session.ts`

- [ ] **Step 1: Replace the file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(
  sessionId: string,
  rpe?: number,
  notes?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      rpe: rpe ?? null,
      notes: notes ?? null,
    })
    .eq('id', sessionId)
    .eq('client_id', user.id)

  if (error) return { error: 'Error al completar la sesión' }

  return { success: true }
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "complete-session"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/training/actions/complete-session.ts
git commit -m "feat(training): persist RPE and notes on session completion"
```

---

## Task 11: Full TypeScript check + test suite

**Why:** Verify all changes compile and existing tests still pass before considering the backend foundation complete.

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If there are errors related to files not yet updated (e.g., UI components still referencing `.reps`), fix those references:
- Replace `.reps` with `.reps_min` (or display as range: `${reps_min}${reps_max && reps_max !== reps_min ? `–${reps_max}` : ''}`)
- Replace `reps:` in object literals with `reps_min:` / `reps_max:`

For display purposes only (UI showing plan details), a helper is useful. Add to `src/features/plans/schemas.ts`:

```typescript
/** Returns a human-readable rep range string: "8", "8–12", or "—" */
export function formatReps(repsMin?: number | null, repsMax?: number | null): string {
  if (repsMin == null) return '—'
  if (repsMax == null || repsMax === repsMin) return String(repsMin)
  return `${repsMin}–${repsMax}`
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass. If existing plan/training tests reference the old `reps` field, update them to use `repsMin` / `repsMax`.

- [ ] **Step 3: Final commit for this plan**

```bash
git add -A
git commit -m "fix: resolve remaining TypeScript errors from data model migration"
```

---

## Self-Review Checklist

- [x] Migration 1 covers `plan_weeks` table, `plan_days.plan_week_id`, data migration, RLS
- [x] Migration 2 covers `reps → reps_min + reps_max` in both `plan_day_exercises` and `client_plan_day_exercises`
- [x] Migration 3 covers `session_sets.reps_performed`, `sessions.rpe`, `sessions.notes`
- [x] Types regenerated after migrations
- [x] `planDayExerciseSchema` updated for `repsMin`/`repsMax`
- [x] `planBuilderPayloadSchema` updated for `planWeeks[]` with count validation
- [x] `validatePlanBuilderForCoach` validates per-week structure, exercise type rules
- [x] `insertPlanWeekTree` creates plan_weeks → plan_days → plan_day_exercises
- [x] `deletePlanWeekTree` cascades via FK (no manual child deletion)
- [x] `create-plan.ts` and `update-plan-full.ts` use new persist API
- [x] `assignPlanAction` reads `plan_weeks → plan_days` per week
- [x] `completeSetSchema` includes `repsPerformed`
- [x] `complete-set.ts` writes `reps_performed` to DB
- [x] `completeSessionAction` accepts and writes `rpe` + `notes`
- [x] Tests updated and passing for all modified schemas

---

## Next Step

After this plan is complete and all tests pass, proceed to:

**`2026-04-20-ui-builder-training-progress.md`** — Plan B: multi-week plan builder UI, live training UI with reps input + RPE, and progress views for coach and client.
