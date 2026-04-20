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
