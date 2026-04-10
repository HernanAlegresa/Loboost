-- Notification preferences (client app settings; no push yet — persisted for future use)
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  reminders boolean not null default true,
  coach_msgs boolean not null default true,
  updated_at timestamptz,
  unique (client_id)
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences: client manages own"
  on public.notification_preferences for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
