-- Unique constraint requerido para el upsert en complete-set action
alter table public.session_sets
  add constraint session_sets_unique_set
  unique (session_id, client_plan_day_exercise_id, set_number);
