-- Allow clients to read exercises from coaches that have assigned them a plan
create policy "exercises: client reads from assigned coach"
  on public.exercises for select
  using (
    exists (
      select 1 from public.client_plans
      where client_plans.client_id = auth.uid()
      and client_plans.coach_id = exercises.coach_id
    )
  );
