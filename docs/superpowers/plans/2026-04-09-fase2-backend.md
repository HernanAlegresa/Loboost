# Fase 2: Backend — Clientes, Ejercicios, Planes y Entrenamiento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar todo el backend de LoBoost Fase 2: gestión de clientes, biblioteca de ejercicios, planes de entrenamiento, asignación de planes, sesiones de entrenamiento en tiempo real, analytics de progreso y adherencia.

**Architecture:** Feature-based con Server Actions para todas las mutaciones. Schemas Zod por feature con TDD. Analytics como funciones puras en `lib/analytics/`. Modelo de copia completa para planes asignados (client_plans). Sesiones guardadas en tiempo real serie por serie.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (supabase-js + ssr + admin), Zod v4, Jest + Testing Library.

---

## Archivos que se crean en esta fase

```
src/
├── features/
│   ├── clients/
│   │   ├── actions/
│   │   │   ├── create-client.ts
│   │   │   └── update-client.ts
│   │   └── schemas.ts
│   ├── exercises/
│   │   ├── __tests__/schemas.test.ts
│   │   ├── actions/
│   │   │   ├── create-exercise.ts
│   │   │   ├── update-exercise.ts
│   │   │   └── delete-exercise.ts
│   │   └── schemas.ts
│   ├── plans/
│   │   ├── __tests__/
│   │   │   ├── schemas.test.ts
│   │   │   └── assign-plan.test.ts
│   │   ├── actions/
│   │   │   ├── create-plan.ts
│   │   │   ├── update-plan.ts
│   │   │   ├── delete-plan.ts
│   │   │   ├── assign-plan.ts
│   │   │   └── update-client-plan.ts
│   │   └── schemas.ts
│   ├── training/
│   │   ├── __tests__/schemas.test.ts
│   │   ├── actions/
│   │   │   ├── start-session.ts
│   │   │   ├── complete-set.ts
│   │   │   └── complete-session.ts
│   │   └── schemas.ts
│   └── coach/
│       ├── actions/
│       │   ├── save-coach-note.ts
│       │   └── log-body-measurement.ts
│       └── schemas.ts
├── lib/
│   └── analytics/
│       ├── __tests__/
│       │   ├── compliance.test.ts
│       │   └── alerts.test.ts
│       ├── compliance.ts
│       ├── alerts.ts
│       └── progress.ts
└── types/
    ├── database.ts  (regenerado)
    └── domain.ts    (nuevo)
supabase/migrations/
    ├── 20260409000000_fase2.sql
    └── 20260409000001_session_sets_unique.sql
```

---

## Task 1: Migración SQL — todas las tablas nuevas

**Files:**
- Create: `supabase/migrations/20260409000000_fase2.sql`

- [ ] **Step 1: Crear el archivo de migración**

Create `supabase/migrations/20260409000000_fase2.sql`:

```sql
-- =============================================
-- client_profiles: datos fitness del cliente
-- =============================================
create table public.client_profiles (
  id               uuid references public.profiles(id) on delete cascade not null primary key,
  age              integer,
  sex              text check (sex in ('male', 'female', 'other')),
  goal             text,
  weight_kg        numeric(5,2),
  height_cm        numeric(5,2),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  days_per_week    integer check (days_per_week between 1 and 7),
  injuries         text,
  created_at       timestamptz default now() not null
);

alter table public.client_profiles enable row level security;

create policy "client_profiles: coach manages own clients"
  on public.client_profiles for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = client_profiles.id
      and profiles.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = client_profiles.id
      and profiles.coach_id = auth.uid()
    )
  );

create policy "client_profiles: client reads own"
  on public.client_profiles for select
  using (id = auth.uid());

-- =============================================
-- exercises: biblioteca del coach
-- =============================================
create table public.exercises (
  id           uuid default gen_random_uuid() primary key,
  coach_id     uuid references public.profiles(id) on delete cascade not null,
  name         text not null,
  muscle_group text not null,
  category     text not null,
  type         text check (type in ('strength', 'cardio')) not null,
  video_url    text,
  created_at   timestamptz default now() not null
);

alter table public.exercises enable row level security;

create policy "exercises: coach manages own"
  on public.exercises for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- =============================================
-- plans: templates del coach
-- =============================================
create table public.plans (
  id          uuid default gen_random_uuid() primary key,
  coach_id    uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  description text,
  weeks       integer check (weeks between 1 and 12) not null,
  created_at  timestamptz default now() not null
);

alter table public.plans enable row level security;

create policy "plans: coach manages own"
  on public.plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- =============================================
-- plan_days: días del template (sin week_number,
-- se repiten igual cada semana)
-- =============================================
create table public.plan_days (
  id          uuid default gen_random_uuid() primary key,
  plan_id     uuid references public.plans(id) on delete cascade not null,
  day_of_week integer check (day_of_week between 1 and 7) not null,
  "order"     integer not null
);

alter table public.plan_days enable row level security;

create policy "plan_days: coach manages own"
  on public.plan_days for all
  using (
    exists (
      select 1 from public.plans
      where plans.id = plan_days.plan_id
      and plans.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plans
      where plans.id = plan_days.plan_id
      and plans.coach_id = auth.uid()
    )
  );

-- =============================================
-- plan_day_exercises: ejercicios por día del template
-- =============================================
create table public.plan_day_exercises (
  id               uuid default gen_random_uuid() primary key,
  plan_day_id      uuid references public.plan_days(id) on delete cascade not null,
  exercise_id      uuid references public.exercises(id) on delete restrict not null,
  "order"          integer not null,
  sets             integer not null,
  reps             integer,
  duration_seconds integer,
  rest_seconds     integer
);

alter table public.plan_day_exercises enable row level security;

create policy "plan_day_exercises: coach manages own"
  on public.plan_day_exercises for all
  using (
    exists (
      select 1 from public.plan_days
      join public.plans on plans.id = plan_days.plan_id
      where plan_days.id = plan_day_exercises.plan_day_id
      and plans.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plan_days
      join public.plans on plans.id = plan_days.plan_id
      where plan_days.id = plan_day_exercises.plan_day_id
      and plans.coach_id = auth.uid()
    )
  );

-- =============================================
-- client_plans: copia del plan asignada al cliente
-- =============================================
create table public.client_plans (
  id         uuid default gen_random_uuid() primary key,
  client_id  uuid references public.profiles(id) on delete cascade not null,
  coach_id   uuid references public.profiles(id) on delete cascade not null,
  plan_id    uuid references public.plans(id) on delete set null,
  name       text not null,
  weeks      integer not null,
  start_date date not null,
  end_date   date not null,
  status     text check (status in ('active', 'completed', 'paused')) default 'active' not null,
  created_at timestamptz default now() not null
);

alter table public.client_plans enable row level security;

create policy "client_plans: coach manages own"
  on public.client_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "client_plans: client reads own"
  on public.client_plans for select
  using (client_id = auth.uid());

-- =============================================
-- client_plan_days
-- =============================================
create table public.client_plan_days (
  id             uuid default gen_random_uuid() primary key,
  client_plan_id uuid references public.client_plans(id) on delete cascade not null,
  week_number    integer not null,
  day_of_week    integer check (day_of_week between 1 and 7) not null,
  "order"        integer not null
);

alter table public.client_plan_days enable row level security;

create policy "client_plan_days: coach manages own clients"
  on public.client_plan_days for all
  using (
    exists (
      select 1 from public.client_plans
      where client_plans.id = client_plan_days.client_plan_id
      and client_plans.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.client_plans
      where client_plans.id = client_plan_days.client_plan_id
      and client_plans.coach_id = auth.uid()
    )
  );

create policy "client_plan_days: client reads own"
  on public.client_plan_days for select
  using (
    exists (
      select 1 from public.client_plans
      where client_plans.id = client_plan_days.client_plan_id
      and client_plans.client_id = auth.uid()
    )
  );

-- =============================================
-- client_plan_day_exercises
-- =============================================
create table public.client_plan_day_exercises (
  id                 uuid default gen_random_uuid() primary key,
  client_plan_day_id uuid references public.client_plan_days(id) on delete cascade not null,
  exercise_id        uuid references public.exercises(id) on delete restrict not null,
  "order"            integer not null,
  sets               integer not null,
  reps               integer,
  duration_seconds   integer,
  rest_seconds       integer
);

alter table public.client_plan_day_exercises enable row level security;

create policy "client_plan_day_exercises: coach manages own clients"
  on public.client_plan_day_exercises for all
  using (
    exists (
      select 1 from public.client_plan_days
      join public.client_plans on client_plans.id = client_plan_days.client_plan_id
      where client_plan_days.id = client_plan_day_exercises.client_plan_day_id
      and client_plans.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.client_plan_days
      join public.client_plans on client_plans.id = client_plan_days.client_plan_id
      where client_plan_days.id = client_plan_day_exercises.client_plan_day_id
      and client_plans.coach_id = auth.uid()
    )
  );

create policy "client_plan_day_exercises: client reads own"
  on public.client_plan_day_exercises for select
  using (
    exists (
      select 1 from public.client_plan_days
      join public.client_plans on client_plans.id = client_plan_days.client_plan_id
      where client_plan_days.id = client_plan_day_exercises.client_plan_day_id
      and client_plans.client_id = auth.uid()
    )
  );

-- =============================================
-- sessions
-- =============================================
create table public.sessions (
  id                 uuid default gen_random_uuid() primary key,
  client_id          uuid references public.profiles(id) on delete cascade not null,
  client_plan_day_id uuid references public.client_plan_days(id) on delete cascade not null,
  date               date not null,
  status             text check (status in ('in_progress', 'completed')) default 'in_progress' not null,
  started_at         timestamptz default now() not null,
  completed_at       timestamptz
);

alter table public.sessions enable row level security;

create policy "sessions: client manages own"
  on public.sessions for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "sessions: coach reads own clients"
  on public.sessions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = sessions.client_id
      and profiles.coach_id = auth.uid()
    )
  );

-- =============================================
-- session_sets
-- =============================================
create table public.session_sets (
  id                          uuid default gen_random_uuid() primary key,
  session_id                  uuid references public.sessions(id) on delete cascade not null,
  client_plan_day_exercise_id uuid references public.client_plan_day_exercises(id) on delete cascade not null,
  set_number                  integer not null,
  weight_kg                   numeric(6,2),
  duration_seconds            integer,
  completed                   boolean default false not null,
  logged_at                   timestamptz default now() not null
);

alter table public.session_sets enable row level security;

create policy "session_sets: client manages own"
  on public.session_sets for all
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_sets.session_id
      and sessions.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = session_sets.session_id
      and sessions.client_id = auth.uid()
    )
  );

create policy "session_sets: coach reads own clients"
  on public.session_sets for select
  using (
    exists (
      select 1 from public.sessions
      join public.profiles on profiles.id = sessions.client_id
      where sessions.id = session_sets.session_id
      and profiles.coach_id = auth.uid()
    )
  );

-- =============================================
-- body_measurements
-- =============================================
create table public.body_measurements (
  id         uuid default gen_random_uuid() primary key,
  client_id  uuid references public.profiles(id) on delete cascade not null,
  date       date not null,
  weight_kg  numeric(5,2),
  notes      text,
  created_at timestamptz default now() not null
);

alter table public.body_measurements enable row level security;

create policy "body_measurements: client manages own"
  on public.body_measurements for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "body_measurements: coach reads own clients"
  on public.body_measurements for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = body_measurements.client_id
      and profiles.coach_id = auth.uid()
    )
  );

-- =============================================
-- coach_notes: notas internas del coach
-- =============================================
create table public.coach_notes (
  id         uuid default gen_random_uuid() primary key,
  coach_id   uuid references public.profiles(id) on delete cascade not null,
  client_id  uuid references public.profiles(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.coach_notes enable row level security;

create policy "coach_notes: coach manages own"
  on public.coach_notes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
```

- [ ] **Step 2: Aplicar migración**

The controller (Claude Code coordinator) applies this migration using the Supabase MCP tool:
- project_id: `zsczvjsqkgmvouzcjcvv`
- name: `fase2`
- query: contents of the file above

Expected: `{"success": true}`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260409000000_fase2.sql
git commit -m "feat: add Fase 2 database migrations (clients, exercises, plans, training)"
```

---

## Task 2: Regenerar tipos TypeScript + tipos de dominio

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/types/domain.ts`

- [ ] **Step 1: Regenerar tipos de Supabase**

The controller calls `mcp__plugin_supabase_supabase__generate_typescript_types` with project_id `zsczvjsqkgmvouzcjcvv` and writes the full output to `src/types/database.ts`, replacing the placeholder content entirely.

- [ ] **Step 2: Crear `src/types/domain.ts`**

```ts
export type ExerciseType = 'strength' | 'cardio'
export type PlanStatus = 'active' | 'completed' | 'paused'
export type SessionStatus = 'in_progress' | 'completed'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female' | 'other'
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 1=lunes, 7=domingo
export type AlertType = 'inactive' | 'low_compliance' | 'no_plan'
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "chore: regenerate Supabase types and add domain types"
```

---

## Task 3: Feature clients — schemas + create-client action

**Files:**
- Create: `src/features/clients/schemas.ts`
- Create: `src/features/clients/actions/create-client.ts`

- [ ] **Step 1: Crear `src/features/clients/schemas.ts`**

```ts
import { z } from 'zod'

export const createClientSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  age: z.coerce.number().int().min(10).max(100),
  sex: z.enum(['male', 'female', 'other']),
  goal: z.string().min(3, 'El objetivo debe tener al menos 3 caracteres'),
  weightKg: z.coerce.number().min(20).max(300),
  heightCm: z.coerce.number().min(100).max(250),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  injuries: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientProfileSchema = z.object({
  age: z.coerce.number().int().min(10).max(100).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  goal: z.string().min(3).optional(),
  weightKg: z.coerce.number().min(20).max(300).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  injuries: z.string().optional(),
})

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
```

- [ ] **Step 2: Crear `src/features/clients/actions/create-client.ts`**

```ts
'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/features/clients/schemas'

export async function createClientAction(formData: FormData) {
  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    age: formData.get('age'),
    sex: formData.get('sex'),
    goal: formData.get('goal'),
    weightKg: formData.get('weightKg'),
    heightCm: formData.get('heightCm'),
    experienceLevel: formData.get('experienceLevel'),
    daysPerWeek: formData.get('daysPerWeek'),
    injuries: formData.get('injuries') || undefined,
  }

  const result = createClientSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser } } = await supabase.auth.getUser()
  if (!coachUser) return { error: 'No autenticado' }

  // Admin client: crea el usuario sin cerrar la sesión del coach
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: {
      role: 'client',
      full_name: result.data.fullName,
    },
  })

  if (authError || !newUser.user) {
    return { error: authError?.message ?? 'Error al crear el usuario' }
  }

  // Asignar coach_id al profile creado por el trigger
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ coach_id: coachUser.id })
    .eq('id', newUser.user.id)

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'Error al asignar el coach al cliente' }
  }

  // Crear client_profile con datos fitness
  const { error: clientProfileError } = await supabaseAdmin
    .from('client_profiles')
    .insert({
      id: newUser.user.id,
      age: result.data.age,
      sex: result.data.sex,
      goal: result.data.goal,
      weight_kg: result.data.weightKg,
      height_cm: result.data.heightCm,
      experience_level: result.data.experienceLevel,
      days_per_week: result.data.daysPerWeek,
      injuries: result.data.injuries ?? null,
    })

  if (clientProfileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'Error al guardar el perfil del cliente' }
  }

  return { success: true, clientId: newUser.user.id }
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/clients/
git commit -m "feat: add client schemas and create-client action with admin API"
```

---

## Task 4: Feature clients — update-client action

**Files:**
- Create: `src/features/clients/actions/update-client.ts`

- [ ] **Step 1: Crear `src/features/clients/actions/update-client.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { updateClientProfileSchema } from '@/features/clients/schemas'

export async function updateClientAction(clientId: string, formData: FormData) {
  const raw = {
    age: formData.get('age') || undefined,
    sex: formData.get('sex') || undefined,
    goal: formData.get('goal') || undefined,
    weightKg: formData.get('weightKg') || undefined,
    heightCm: formData.get('heightCm') || undefined,
    experienceLevel: formData.get('experienceLevel') || undefined,
    daysPerWeek: formData.get('daysPerWeek') || undefined,
    injuries: formData.get('injuries') || undefined,
  }

  const result = updateClientProfileSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (result.data.age !== undefined) updates.age = result.data.age
  if (result.data.sex !== undefined) updates.sex = result.data.sex
  if (result.data.goal !== undefined) updates.goal = result.data.goal
  if (result.data.weightKg !== undefined) updates.weight_kg = result.data.weightKg
  if (result.data.heightCm !== undefined) updates.height_cm = result.data.heightCm
  if (result.data.experienceLevel !== undefined) updates.experience_level = result.data.experienceLevel
  if (result.data.daysPerWeek !== undefined) updates.days_per_week = result.data.daysPerWeek
  if (result.data.injuries !== undefined) updates.injuries = result.data.injuries

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await supabase
    .from('client_profiles')
    .update(updates)
    .eq('id', clientId)

  if (error) return { error: 'Error al actualizar el cliente' }

  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clients/actions/update-client.ts
git commit -m "feat: add update-client action"
```

---

## Task 5: Feature exercises — schemas (TDD) + CRUD actions

**Files:**
- Create: `src/features/exercises/schemas.ts`
- Create: `src/features/exercises/__tests__/schemas.test.ts`
- Create: `src/features/exercises/actions/create-exercise.ts`
- Create: `src/features/exercises/actions/update-exercise.ts`
- Create: `src/features/exercises/actions/delete-exercise.ts`

- [ ] **Step 1: Escribir test**

Create `src/features/exercises/__tests__/schemas.test.ts`:

```ts
import { exerciseSchema } from '@/features/exercises/schemas'

describe('exerciseSchema', () => {
  it('accepts valid strength exercise', () => {
    const result = exerciseSchema.safeParse({
      name: 'Press de banca',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'strength',
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with video url', () => {
    const result = exerciseSchema.safeParse({
      name: 'Cinta',
      muscleGroup: 'Cardio',
      category: 'Aeróbico',
      type: 'cardio',
      videoUrl: 'https://youtube.com/watch?v=abc123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = exerciseSchema.safeParse({
      name: 'Press',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = exerciseSchema.safeParse({
      name: '',
      muscleGroup: 'Pecho',
      category: 'Fuerza',
      type: 'strength',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar test — esperar FAIL**

```bash
npx jest src/features/exercises/__tests__/schemas.test.ts --no-coverage
```

Expected: `Cannot find module '@/features/exercises/schemas'`

- [ ] **Step 3: Crear `src/features/exercises/schemas.ts`**

```ts
import { z } from 'zod'

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  muscleGroup: z.string().min(1, 'El grupo muscular es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  type: z.enum(['strength', 'cardio']),
  videoUrl: z.string().url('URL de video inválida').optional(),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>
```

- [ ] **Step 4: Ejecutar test — esperar PASS**

```bash
npx jest src/features/exercises/__tests__/schemas.test.ts --no-coverage
```

Expected: 4 tests pass.

- [ ] **Step 5: Crear `src/features/exercises/actions/create-exercise.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export async function createExerciseAction(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    category: formData.get('category'),
    type: formData.get('type'),
    videoUrl: formData.get('videoUrl') || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      coach_id: user.id,
      name: result.data.name,
      muscle_group: result.data.muscleGroup,
      category: result.data.category,
      type: result.data.type,
      video_url: result.data.videoUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al crear el ejercicio' }

  return { success: true, exerciseId: data.id }
}
```

- [ ] **Step 6: Crear `src/features/exercises/actions/update-exercise.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { exerciseSchema } from '@/features/exercises/schemas'

export async function updateExerciseAction(exerciseId: string, formData: FormData) {
  const raw = {
    name: formData.get('name'),
    muscleGroup: formData.get('muscleGroup'),
    category: formData.get('category'),
    type: formData.get('type'),
    videoUrl: formData.get('videoUrl') || undefined,
  }

  const result = exerciseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('exercises')
    .update({
      name: result.data.name,
      muscle_group: result.data.muscleGroup,
      category: result.data.category,
      type: result.data.type,
      video_url: result.data.videoUrl ?? null,
    })
    .eq('id', exerciseId)

  if (error) return { error: 'Error al actualizar el ejercicio' }

  return { success: true }
}
```

- [ ] **Step 7: Crear `src/features/exercises/actions/delete-exercise.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteExerciseAction(exerciseId: string) {
  const supabase = await createClient()

  // ON DELETE RESTRICT en plan_day_exercises y client_plan_day_exercises
  // Si el ejercicio está en uso, Postgres retorna error 23503
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId)

  if (error) {
    if (error.code === '23503') {
      return { error: 'No se puede eliminar: el ejercicio está en uso en un plan' }
    }
    return { error: 'Error al eliminar el ejercicio' }
  }

  return { success: true }
}
```

- [ ] **Step 8: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/features/exercises/
git commit -m "feat: add exercise schemas (TDD) and CRUD actions"
```

---

## Task 6: Feature plans — schemas (TDD) + template CRUD

**Files:**
- Create: `src/features/plans/schemas.ts`
- Create: `src/features/plans/__tests__/schemas.test.ts`
- Create: `src/features/plans/actions/create-plan.ts`
- Create: `src/features/plans/actions/update-plan.ts`
- Create: `src/features/plans/actions/delete-plan.ts`

- [ ] **Step 1: Escribir test**

Create `src/features/plans/__tests__/schemas.test.ts`:

```ts
import { createPlanSchema, planDayExerciseSchema } from '@/features/plans/schemas'

describe('createPlanSchema', () => {
  it('accepts valid plan', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan fuerza 8 semanas', weeks: 8 })
    expect(result.success).toBe(true)
  })

  it('rejects weeks > 12', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan', weeks: 13 })
    expect(result.success).toBe(false)
  })

  it('rejects weeks < 1', () => {
    const result = createPlanSchema.safeParse({ name: 'Plan', weeks: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createPlanSchema.safeParse({ name: '', weeks: 4 })
    expect(result.success).toBe(false)
  })
})

describe('planDayExerciseSchema', () => {
  it('accepts strength exercise with reps', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: '123e4567-e89b-12d3-a456-426614174000',
      order: 1,
      sets: 4,
      reps: 10,
      restSeconds: 90,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio exercise with duration', () => {
    const result = planDayExerciseSchema.safeParse({
      exerciseId: '123e4567-e89b-12d3-a456-426614174000',
      order: 1,
      sets: 1,
      durationSeconds: 1800,
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar test — esperar FAIL**

```bash
npx jest src/features/plans/__tests__/schemas.test.ts --no-coverage
```

Expected: `Cannot find module '@/features/plans/schemas'`

- [ ] **Step 3: Crear `src/features/plans/schemas.ts`**

```ts
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

export const planDayExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  order: z.coerce.number().int().min(1),
  sets: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
})

export type PlanDayExerciseInput = z.infer<typeof planDayExerciseSchema>

export const assignPlanSchema = z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().date(),
})

export type AssignPlanInput = z.infer<typeof assignPlanSchema>

export const updateClientPlanExerciseSchema = z.object({
  sets: z.coerce.number().int().min(1).optional(),
  reps: z.coerce.number().int().min(1).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
  restSeconds: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(1).optional(),
})

export type UpdateClientPlanExerciseInput = z.infer<typeof updateClientPlanExerciseSchema>
```

- [ ] **Step 4: Ejecutar test — esperar PASS**

```bash
npx jest src/features/plans/__tests__/schemas.test.ts --no-coverage
```

Expected: 6 tests pass.

- [ ] **Step 5: Crear `src/features/plans/actions/create-plan.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createPlanSchema, planDaySchema, planDayExerciseSchema } from '@/features/plans/schemas'
import type { PlanDayInput, PlanDayExerciseInput } from '@/features/plans/schemas'

export async function createPlanAction(
  formData: FormData,
  days: Array<{ day: PlanDayInput; exercises: PlanDayExerciseInput[] }>
) {
  const raw = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    weeks: formData.get('weeks'),
  }

  const result = createPlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      coach_id: user.id,
      name: result.data.name,
      description: result.data.description ?? null,
      weeks: result.data.weeks,
    })
    .select('id')
    .single()

  if (planError || !plan) return { error: 'Error al crear el plan' }

  for (const { day, exercises } of days) {
    const dayResult = planDaySchema.safeParse(day)
    if (!dayResult.success) return { error: 'Datos de día inválidos' }

    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_of_week: dayResult.data.dayOfWeek,
        order: dayResult.data.order,
      })
      .select('id')
      .single()

    if (dayError || !planDay) return { error: 'Error al crear el día del plan' }

    for (const exercise of exercises) {
      const exResult = planDayExerciseSchema.safeParse(exercise)
      if (!exResult.success) return { error: 'Datos de ejercicio inválidos' }

      const { error: exError } = await supabase
        .from('plan_day_exercises')
        .insert({
          plan_day_id: planDay.id,
          exercise_id: exResult.data.exerciseId,
          order: exResult.data.order,
          sets: exResult.data.sets,
          reps: exResult.data.reps ?? null,
          duration_seconds: exResult.data.durationSeconds ?? null,
          rest_seconds: exResult.data.restSeconds ?? null,
        })

      if (exError) return { error: 'Error al agregar ejercicio al plan' }
    }
  }

  return { success: true, planId: plan.id }
}
```

- [ ] **Step 6: Crear `src/features/plans/actions/update-plan.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { updatePlanSchema } from '@/features/plans/schemas'

export async function updatePlanAction(planId: string, formData: FormData) {
  const raw = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    weeks: formData.get('weeks') || undefined,
  }

  const result = updatePlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (result.data.name) updates.name = result.data.name
  if (result.data.description !== undefined) updates.description = result.data.description
  if (result.data.weeks) updates.weeks = result.data.weeks

  if (Object.keys(updates).length === 0) return { success: true }

  const { error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', planId)

  if (error) return { error: 'Error al actualizar el plan' }

  return { success: true }
}
```

- [ ] **Step 7: Crear `src/features/plans/actions/delete-plan.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function deletePlanAction(planId: string) {
  const supabase = await createClient()

  // plan_days y plan_day_exercises se eliminan en cascada
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) return { error: 'Error al eliminar el plan' }

  return { success: true }
}
```

- [ ] **Step 8: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/features/plans/
git commit -m "feat: add plan schemas (TDD) and template CRUD actions"
```

---

## Task 7: Feature plans — assign-plan action (TDD lógica de copia)

**Files:**
- Create: `src/features/plans/actions/assign-plan.ts`
- Create: `src/features/plans/__tests__/assign-plan.test.ts`

- [ ] **Step 1: Escribir test**

Create `src/features/plans/__tests__/assign-plan.test.ts`:

```ts
import { calculateEndDate } from '@/features/plans/actions/assign-plan'

describe('calculateEndDate', () => {
  it('adds correct days for 4 weeks starting 2026-04-09', () => {
    const start = new Date('2026-04-09')
    const end = calculateEndDate(start, 4)
    expect(end.toISOString().split('T')[0]).toBe('2026-05-06')
  })

  it('adds correct days for 1 week', () => {
    const start = new Date('2026-04-09')
    const end = calculateEndDate(start, 1)
    expect(end.toISOString().split('T')[0]).toBe('2026-04-15')
  })

  it('adds correct days for 12 weeks', () => {
    const start = new Date('2026-01-01')
    const end = calculateEndDate(start, 12)
    expect(end.toISOString().split('T')[0]).toBe('2026-03-25')
  })
})
```

- [ ] **Step 2: Ejecutar test — esperar FAIL**

```bash
npx jest src/features/plans/__tests__/assign-plan.test.ts --no-coverage
```

Expected: `Cannot find module '@/features/plans/actions/assign-plan'`

- [ ] **Step 3: Crear `src/features/plans/actions/assign-plan.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { assignPlanSchema } from '@/features/plans/schemas'

export function calculateEndDate(startDate: Date, weeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + weeks * 7 - 1)
  return end
}

export async function assignPlanAction(formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    planId: formData.get('planId'),
    startDate: formData.get('startDate'),
  }

  const result = assignPlanSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user: coachUser } } = await supabase.auth.getUser()
  if (!coachUser) return { error: 'No autenticado' }

  // Obtener el plan template con días y ejercicios
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select(`
      id, name, weeks,
      plan_days (
        id, day_of_week, order,
        plan_day_exercises (
          id, exercise_id, order, sets, reps, duration_seconds, rest_seconds
        )
      )
    `)
    .eq('id', result.data.planId)
    .single()

  if (planError || !plan) return { error: 'Plan no encontrado' }

  const startDate = new Date(result.data.startDate)
  const endDate = calculateEndDate(startDate, plan.weeks)

  // Marcar plan activo anterior como completado
  await supabase
    .from('client_plans')
    .update({ status: 'completed' })
    .eq('client_id', result.data.clientId)
    .eq('status', 'active')

  // Crear client_plan
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

  if (clientPlanError || !clientPlan) return { error: 'Error al asignar el plan' }

  // Copiar días y ejercicios para cada semana (1 a N)
  const sortedDays = [...((plan.plan_days as any[]) ?? [])].sort(
    (a, b) => a.order - b.order
  )

  for (let week = 1; week <= plan.weeks; week++) {
    for (const day of sortedDays) {
      const { data: clientDay, error: dayError } = await supabase
        .from('client_plan_days')
        .insert({
          client_plan_id: clientPlan.id,
          week_number: week,
          day_of_week: day.day_of_week,
          order: day.order,
        })
        .select('id')
        .single()

      if (dayError || !clientDay) return { error: 'Error al copiar los días del plan' }

      const sortedExercises = [...((day.plan_day_exercises as any[]) ?? [])].sort(
        (a: any, b: any) => a.order - b.order
      )

      for (const exercise of sortedExercises) {
        const { error: exError } = await supabase
          .from('client_plan_day_exercises')
          .insert({
            client_plan_day_id: clientDay.id,
            exercise_id: exercise.exercise_id,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps ?? null,
            duration_seconds: exercise.duration_seconds ?? null,
            rest_seconds: exercise.rest_seconds ?? null,
          })

        if (exError) return { error: 'Error al copiar ejercicios del plan' }
      }
    }
  }

  return { success: true, clientPlanId: clientPlan.id }
}
```

- [ ] **Step 4: Ejecutar test — esperar PASS**

```bash
npx jest src/features/plans/__tests__/assign-plan.test.ts --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/features/plans/actions/assign-plan.ts src/features/plans/__tests__/assign-plan.test.ts
git commit -m "feat: add assign-plan action with full copy logic (TDD)"
```

---

## Task 8: Feature plans — edit client plan action

**Files:**
- Create: `src/features/plans/actions/update-client-plan.ts`

- [ ] **Step 1: Crear `src/features/plans/actions/update-client-plan.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { updateClientPlanExerciseSchema } from '@/features/plans/schemas'

export async function updateClientPlanExerciseAction(
  clientPlanDayExerciseId: string,
  formData: FormData
) {
  const raw = {
    sets: formData.get('sets') || undefined,
    reps: formData.get('reps') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
    restSeconds: formData.get('restSeconds') || undefined,
    order: formData.get('order') || undefined,
  }

  const result = updateClientPlanExerciseSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (result.data.sets !== undefined) updates.sets = result.data.sets
  if (result.data.reps !== undefined) updates.reps = result.data.reps
  if (result.data.durationSeconds !== undefined) updates.duration_seconds = result.data.durationSeconds
  if (result.data.restSeconds !== undefined) updates.rest_seconds = result.data.restSeconds
  if (result.data.order !== undefined) updates.order = result.data.order

  if (Object.keys(updates).length === 0) return { success: true }

  // RLS garantiza que solo el coach dueño del plan puede actualizar
  const { error } = await supabase
    .from('client_plan_day_exercises')
    .update(updates)
    .eq('id', clientPlanDayExerciseId)

  if (error) return { error: 'Error al actualizar el ejercicio del cliente' }

  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/plans/actions/update-client-plan.ts
git commit -m "feat: add update-client-plan-exercise action for coach edits"
```

---

## Task 9: Feature training — schemas (TDD) + start-session + complete-set

**Files:**
- Create: `src/features/training/schemas.ts`
- Create: `src/features/training/__tests__/schemas.test.ts`
- Create: `src/features/training/actions/start-session.ts`
- Create: `src/features/training/actions/complete-set.ts`

- [ ] **Step 1: Escribir test**

Create `src/features/training/__tests__/schemas.test.ts`:

```ts
import { completeSetSchema } from '@/features/training/schemas'

describe('completeSetSchema', () => {
  it('accepts strength set with weight', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 1,
      weightKg: 80,
    })
    expect(result.success).toBe(true)
  })

  it('accepts cardio set with duration', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 1,
      durationSeconds: 1800,
    })
    expect(result.success).toBe(true)
  })

  it('rejects set_number less than 1', () => {
    const result = completeSetSchema.safeParse({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      clientPlanDayExerciseId: '123e4567-e89b-12d3-a456-426614174001',
      setNumber: 0,
      weightKg: 80,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar test — esperar FAIL**

```bash
npx jest src/features/training/__tests__/schemas.test.ts --no-coverage
```

- [ ] **Step 3: Crear `src/features/training/schemas.ts`**

```ts
import { z } from 'zod'

export const startSessionSchema = z.object({
  clientPlanDayId: z.string().uuid(),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>

export const completeSetSchema = z.object({
  sessionId: z.string().uuid(),
  clientPlanDayExerciseId: z.string().uuid(),
  setNumber: z.coerce.number().int().min(1),
  weightKg: z.coerce.number().min(0).optional(),
  durationSeconds: z.coerce.number().int().min(1).optional(),
})

export type CompleteSetInput = z.infer<typeof completeSetSchema>
```

- [ ] **Step 4: Ejecutar test — esperar PASS**

```bash
npx jest src/features/training/__tests__/schemas.test.ts --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 5: Crear `src/features/training/actions/start-session.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { startSessionSchema } from '@/features/training/schemas'

export async function startSessionAction(formData: FormData) {
  const raw = { clientPlanDayId: formData.get('clientPlanDayId') }

  const result = startSessionSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Si ya existe una sesión para este día (in_progress o completed), retornarla
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('client_plan_day_id', result.data.clientPlanDayId)
    .eq('client_id', user.id)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle()

  if (existing) {
    return { success: true, sessionId: existing.id, resumed: true }
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      client_id: user.id,
      client_plan_day_id: result.data.clientPlanDayId,
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error || !session) return { error: 'Error al iniciar la sesión' }

  return { success: true, sessionId: session.id, resumed: false }
}
```

- [ ] **Step 6: Crear `src/features/training/actions/complete-set.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { completeSetSchema } from '@/features/training/schemas'

export async function completeSetAction(formData: FormData) {
  const raw = {
    sessionId: formData.get('sessionId'),
    clientPlanDayExerciseId: formData.get('clientPlanDayExerciseId'),
    setNumber: formData.get('setNumber'),
    weightKg: formData.get('weightKg') || undefined,
    durationSeconds: formData.get('durationSeconds') || undefined,
  }

  const result = completeSetSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()

  // Upsert: si ya existe esa serie la actualiza, si no la crea
  const { error } = await supabase
    .from('session_sets')
    .upsert(
      {
        session_id: result.data.sessionId,
        client_plan_day_exercise_id: result.data.clientPlanDayExerciseId,
        set_number: result.data.setNumber,
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

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/features/training/
git commit -m "feat: add training schemas (TDD), start-session and complete-set actions"
```

---

## Task 10: Feature training — complete-session action

**Files:**
- Create: `src/features/training/actions/complete-session.ts`

- [ ] **Step 1: Crear `src/features/training/actions/complete-session.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function completeSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('client_id', user.id) // RLS: el cliente solo puede cerrar sus propias sesiones

  if (error) return { error: 'Error al completar la sesión' }

  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/training/actions/complete-session.ts
git commit -m "feat: add complete-session action"
```

---

## Task 11: Feature coach — notas y mediciones corporales

**Files:**
- Create: `src/features/coach/schemas.ts`
- Create: `src/features/coach/actions/save-coach-note.ts`
- Create: `src/features/coach/actions/log-body-measurement.ts`

- [ ] **Step 1: Crear `src/features/coach/schemas.ts`**

```ts
import { z } from 'zod'

export const coachNoteSchema = z.object({
  clientId: z.string().uuid(),
  content: z.string().min(1, 'La nota no puede estar vacía'),
})

export type CoachNoteInput = z.infer<typeof coachNoteSchema>

export const bodyMeasurementSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().date(),
  weightKg: z.coerce.number().min(20).max(300).optional(),
  notes: z.string().optional(),
})

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>
```

- [ ] **Step 2: Crear `src/features/coach/actions/save-coach-note.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { coachNoteSchema } from '@/features/coach/schemas'

export async function saveCoachNoteAction(noteId: string | null, formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    content: formData.get('content'),
  }

  const result = coachNoteSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (noteId) {
    // Actualizar nota existente
    const { error } = await supabase
      .from('coach_notes')
      .update({
        content: result.data.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('coach_id', user.id)

    if (error) return { error: 'Error al actualizar la nota' }
    return { success: true }
  }

  // Crear nota nueva
  const { data, error } = await supabase
    .from('coach_notes')
    .insert({
      coach_id: user.id,
      client_id: result.data.clientId,
      content: result.data.content,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al guardar la nota' }

  return { success: true, noteId: data.id }
}
```

- [ ] **Step 3: Crear `src/features/coach/actions/log-body-measurement.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { bodyMeasurementSchema } from '@/features/coach/schemas'

export async function logBodyMeasurementAction(formData: FormData) {
  const raw = {
    clientId: formData.get('clientId'),
    date: formData.get('date'),
    weightKg: formData.get('weightKg') || undefined,
    notes: formData.get('notes') || undefined,
  }

  const result = bodyMeasurementSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // El coach registra mediciones del cliente usando admin client
  // RLS permite al coach leer pero no insertar mediciones del cliente
  // Usamos service role para insertar en nombre del cliente
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verificar que el cliente pertenece al coach
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', result.data.clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!clientProfile) return { error: 'Cliente no encontrado' }

  const { error } = await supabaseAdmin
    .from('body_measurements')
    .insert({
      client_id: result.data.clientId,
      date: result.data.date,
      weight_kg: result.data.weightKg ?? null,
      notes: result.data.notes ?? null,
    })

  if (error) return { error: 'Error al registrar la medición' }

  return { success: true }
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/coach/
git commit -m "feat: add coach notes and body measurement actions"
```

---

## Task 12: Analytics — compliance y alertas (TDD)

**Files:**
- Create: `src/lib/analytics/compliance.ts`
- Create: `src/lib/analytics/alerts.ts`
- Create: `src/lib/analytics/__tests__/compliance.test.ts`
- Create: `src/lib/analytics/__tests__/alerts.test.ts`

- [ ] **Step 1: Escribir test de compliance**

Create `src/lib/analytics/__tests__/compliance.test.ts`:

```ts
import { calculateWeeklyCompliance } from '@/lib/analytics/compliance'

describe('calculateWeeklyCompliance', () => {
  it('returns 100 when all sessions completed', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 3, completedDays: 3 })).toBe(100)
  })

  it('returns 0 when no sessions completed', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 3, completedDays: 0 })).toBe(0)
  })

  it('returns correct percentage for partial completion', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 4, completedDays: 3 })).toBe(75)
  })

  it('returns 0 when no expected days', () => {
    expect(calculateWeeklyCompliance({ expectedDays: 0, completedDays: 0 })).toBe(0)
  })
})
```

- [ ] **Step 2: Escribir test de alertas**

Create `src/lib/analytics/__tests__/alerts.test.ts`:

```ts
import { getClientAlerts } from '@/lib/analytics/alerts'

describe('getClientAlerts', () => {
  it('returns inactive alert when last session was more than 5 days ago', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 6)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 80, hasActivePlan: true })
    expect(alerts).toContain('inactive')
  })

  it('returns low_compliance alert when below 60%', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 1)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 50, hasActivePlan: true })
    expect(alerts).toContain('low_compliance')
  })

  it('returns no alerts for active compliant client', () => {
    const lastSessionDate = new Date()
    lastSessionDate.setDate(lastSessionDate.getDate() - 1)
    const alerts = getClientAlerts({ lastSessionDate, weeklyCompliance: 80, hasActivePlan: true })
    expect(alerts).toHaveLength(0)
  })

  it('returns no_plan alert when client has no active plan', () => {
    const alerts = getClientAlerts({ lastSessionDate: null, weeklyCompliance: 0, hasActivePlan: false })
    expect(alerts).toContain('no_plan')
  })
})
```

- [ ] **Step 3: Ejecutar tests — esperar FAIL**

```bash
npx jest src/lib/analytics/ --no-coverage
```

- [ ] **Step 4: Crear `src/lib/analytics/compliance.ts`**

```ts
export type ComplianceInput = {
  expectedDays: number
  completedDays: number
}

export function calculateWeeklyCompliance({ expectedDays, completedDays }: ComplianceInput): number {
  if (expectedDays === 0) return 0
  return Math.round((completedDays / expectedDays) * 100)
}
```

- [ ] **Step 5: Crear `src/lib/analytics/alerts.ts`**

```ts
import type { AlertType } from '@/types/domain'

export type AlertInput = {
  lastSessionDate: Date | null
  weeklyCompliance: number
  hasActivePlan: boolean
}

const INACTIVITY_THRESHOLD_DAYS = 5
const LOW_COMPLIANCE_THRESHOLD = 60

export function getClientAlerts({ lastSessionDate, weeklyCompliance, hasActivePlan }: AlertInput): AlertType[] {
  const alerts: AlertType[] = []

  if (!hasActivePlan) {
    alerts.push('no_plan')
    return alerts
  }

  if (lastSessionDate) {
    const daysSinceLastSession = Math.floor(
      (Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastSession > INACTIVITY_THRESHOLD_DAYS) {
      alerts.push('inactive')
    }
  }

  if (weeklyCompliance < LOW_COMPLIANCE_THRESHOLD) {
    alerts.push('low_compliance')
  }

  return alerts
}
```

- [ ] **Step 6: Ejecutar tests — esperar PASS**

```bash
npx jest src/lib/analytics/ --no-coverage
```

Expected: 8 tests pass.

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/analytics/
git commit -m "feat: add compliance and alerts analytics (TDD)"
```

---

## Task 13: Analytics — progreso por ejercicio

**Files:**
- Create: `src/lib/analytics/progress.ts`

- [ ] **Step 1: Crear `src/lib/analytics/progress.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export type SetRecord = {
  date: string
  setNumber: number
  weightKg: number | null
  durationSeconds: number | null
}

export type ExerciseProgress = {
  exerciseId: string
  exerciseName: string
  records: SetRecord[]
}

export async function getExerciseProgress(
  clientId: string,
  exerciseId: string
): Promise<ExerciseProgress | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('session_sets')
    .select(`
      set_number,
      weight_kg,
      duration_seconds,
      logged_at,
      client_plan_day_exercises!inner (
        exercise_id,
        exercises!inner ( id, name )
      ),
      sessions!inner (
        date,
        client_id
      )
    `)
    .eq('sessions.client_id', clientId)
    .eq('client_plan_day_exercises.exercise_id', exerciseId)
    .eq('completed', true)
    .order('logged_at', { ascending: true })

  if (error || !data || data.length === 0) return null

  const first = data[0] as any
  const exerciseName = first.client_plan_day_exercises?.exercises?.name ?? ''

  const records: SetRecord[] = data.map((row: any) => ({
    date: row.sessions?.date ?? '',
    setNumber: row.set_number,
    weightKg: row.weight_kg,
    durationSeconds: row.duration_seconds,
  }))

  return { exerciseId, exerciseName, records }
}

export async function getClientLastSession(clientId: string): Promise<Date | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sessions')
    .select('completed_at')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.completed_at) return null
  return new Date(data.completed_at)
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/progress.ts
git commit -m "feat: add exercise progress and last session analytics"
```

---

## Task 14: Unique constraint en session_sets + verificación final

**Files:**
- Create: `supabase/migrations/20260409000001_session_sets_unique.sql`

- [ ] **Step 1: Crear migración**

Create `supabase/migrations/20260409000001_session_sets_unique.sql`:

```sql
-- Unique constraint requerido para el upsert en complete-set action
alter table public.session_sets
  add constraint session_sets_unique_set
  unique (session_id, client_plan_day_exercise_id, set_number);
```

- [ ] **Step 2: Aplicar migración**

The controller applies this migration with:
- project_id: `zsczvjsqkgmvouzcjcvv`
- name: `session_sets_unique`
- query: contents of the file above

Expected: `{"success": true}`

- [ ] **Step 3: Correr todos los tests**

```bash
npx jest --no-coverage
```

Expected: todos los tests pasan (incluyendo Fase 1).

- [ ] **Step 4: Verificar TypeScript final**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260409000001_session_sets_unique.sql
git commit -m "feat: add unique constraint for session_sets upsert + final verification"
```
