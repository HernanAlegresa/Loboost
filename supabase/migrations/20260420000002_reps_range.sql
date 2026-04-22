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
