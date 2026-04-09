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
