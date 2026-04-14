-- V1: timezone del cliente + slots materializados en client_plan_days
-- Backfill alineado con src/features/clients/utils/training-utils.ts::computeDayDate

-- 1) Perfil cliente: IANA (ej. America/Mexico_City). Default hasta que el producto lo edite.
alter table public.client_profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.client_profiles
  add column if not exists country_code text;

comment on column public.client_profiles.timezone is
  'IANA timezone for calendar-week / "today" logic for this client.';

comment on column public.client_profiles.country_code is
  'ISO 3166-1 alpha-2 country code (AR, MX, ES…). Nullable for existing clients.';

-- 2) Slot materializado
alter table public.client_plan_days
  add column if not exists scheduled_date date,
  add column if not exists slot_status text not null default 'scheduled'
    check (slot_status in ('scheduled', 'completed', 'cancelled', 'superseded')),
  add column if not exists updated_at timestamptz not null default now();

comment on column public.client_plan_days.scheduled_date is
  'Calendar date of this occurrence; derived from client_plans.start_date + week/day offset (V1 same as computeDayDate).';
comment on column public.client_plan_days.slot_status is
  'scheduled=counts as expected; completed=set only with completed session (app); cancelled/superseded=excluded from expected/debt.';

-- 3) Backfill scheduled_date (must match app: date + ((week-1)*7 + (dow-1)) days)
update public.client_plan_days cpd
set  scheduled_date = cp.start_date
    + ((cpd.week_number - 1) * 7 + (cpd.day_of_week - 1)),
  updated_at = now()
from public.client_plans cp
where cp.id = cpd.client_plan_id
  and cpd.scheduled_date is null;

alter table public.client_plan_days
  alter column scheduled_date set not null;

create index if not exists client_plan_days_client_plan_id_scheduled_date_idx
  on public.client_plan_days (client_plan_id, scheduled_date);

-- 4) slot_status desde sesiones ya completadas (sesión = fuente de verdad)
update public.client_plan_days cpd
set
  slot_status = 'completed',
  updated_at = now()
where exists (
  select 1
  from public.sessions s
  where s.client_plan_day_id = cpd.id
    and s.status = 'completed'
);

-- 5) Alinear sessions.date con el slot (histórico coherente tras materializar)
update public.sessions s
set date = cpd.scheduled_date
from public.client_plan_days cpd
where cpd.id = s.client_plan_day_id
  and s.date is distinct from cpd.scheduled_date;
