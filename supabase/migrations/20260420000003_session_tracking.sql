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
