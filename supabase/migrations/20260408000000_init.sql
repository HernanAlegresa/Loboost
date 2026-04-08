-- =============================================
-- Tabla: profiles
-- Extiende auth.users con rol y datos del usuario
-- =============================================

create table public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  role       text check (role in ('coach', 'client')) not null,
  full_name  text,
  avatar_url text,
  coach_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;

-- Cada usuario puede ver su propio perfil
create policy "profiles: select own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Cada usuario puede actualizar su propio perfil
create policy "profiles: update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Coach puede ver los perfiles de sus clientes
create policy "profiles: coach sees own clients"
  on public.profiles
  for select
  using (
    coach_id = auth.uid()
  );

-- =============================================
-- Trigger: crear perfil al registrarse
-- El rol se pasa en raw_user_meta_data.role
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'coach'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
