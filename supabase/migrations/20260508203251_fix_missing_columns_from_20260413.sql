-- Fix: apply DDL that was recorded but never executed from migration 20260413120000

-- client_profiles: timezone + country_code
alter table public.client_profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.client_profiles
  add column if not exists country_code text;

-- client_plan_days: scheduled_date (nullable first), slot_status, updated_at
alter table public.client_plan_days
  add column if not exists scheduled_date date,
  add column if not exists slot_status text not null default 'scheduled'
    check (slot_status in ('scheduled', 'completed', 'cancelled', 'superseded')),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill scheduled_date for existing rows
update public.client_plan_days cpd
set
  scheduled_date = cp.start_date + ((cpd.week_number - 1) * 7 + (cpd.day_of_week - 1)),
  updated_at = now()
from public.client_plans cp
where cp.id = cpd.client_plan_id
  and cpd.scheduled_date is null;

alter table public.client_plan_days
  alter column scheduled_date set not null;

create index if not exists client_plan_days_client_plan_id_scheduled_date_idx
  on public.client_plan_days (client_plan_id, scheduled_date);

-- Sync slot_status for days that already have a completed session
update public.client_plan_days cpd
set slot_status = 'completed', updated_at = now()
where exists (
  select 1 from public.sessions s
  where s.client_plan_day_id = cpd.id and s.status = 'completed'
);

-- Align sessions.date with the materialized scheduled_date
update public.sessions s
set date = cpd.scheduled_date
from public.client_plan_days cpd
where cpd.id = s.client_plan_day_id
  and s.date is distinct from cpd.scheduled_date;
