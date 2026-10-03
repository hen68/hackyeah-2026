-- Profiles: one row per auth user, holding the role and onboarding answers.
-- Onboarding columns are nullable because clinicians share the table.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'clinician')),
  display_name text check (char_length(display_name) <= 80),
  age_band text check (age_band in ('40_44', '45_49', '50_54', '55_59', '60_plus')),
  last_period text check (last_period in ('lt_3m', '3_12m', 'gt_12m', 'unsure')),
  hrt_status text check (hrt_status in ('yes', 'no', 'unsure')),
  menopause_stage text check (menopause_stage in ('perimenopause', 'menopause', 'postmenopause', 'unknown')),
  timezone text not null default 'Europe/Warsaw',
  onboarding_completed_at timestamptz,
  reminder_enabled boolean not null default true,
  reminder_time time not null default '09:00',
  text_size text not null default 'large' check (text_size in ('normal', 'large')),
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Signup bootstrap. The role is hard-coded: raw_user_meta_data is client-controlled
-- and is never read.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Only the service role (or an operator in SQL) may change a role.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') then
    raise exception 'role cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.guard_profile_role();

create or replace function private.current_role_is(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = p_role
  );
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.guard_profile_role() from public;
revoke all on function private.current_role_is(text) from public;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;
grant execute on function private.current_role_is(text) to authenticated;

-- Own-row access. The care team's read access is added in the care_team migration.
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
