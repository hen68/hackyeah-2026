-- Symptom catalog and per-patient monitoring plan (US-01).
-- The plan is editable by the patient and by their care team.

create table public.symptom_catalog (
  code text primary key check (code ~ '^[a-z_]{2,40}$'),
  label text not null,
  is_default boolean not null default false,
  sort int not null default 0
);
alter table public.symptom_catalog enable row level security;

create policy symptom_catalog_select on public.symptom_catalog for select to authenticated
  using (true);

create table public.monitoring_plans (
  patient_id uuid primary key references public.profiles (id) on delete cascade,
  symptom_codes text[] not null default '{}',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.monitoring_plans enable row level security;
create index monitoring_plans_updated_by_idx on public.monitoring_plans (updated_by);

create trigger monitoring_plans_set_updated_at before update on public.monitoring_plans
  for each row execute function private.set_updated_at();

-- Arrays can't carry FKs, so validate the codes against the catalog.
create or replace function private.validate_monitoring_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.symptom_codes) as c(code)
    where not exists (select 1 from public.symptom_catalog s where s.code = c.code)
  ) then
    raise exception 'unknown symptom code in monitoring plan' using errcode = '23503';
  end if;
  return new;
end;
$$;

-- Record who last edited the plan (patient or clinician); never trust the client value.
create or replace function private.stamp_plan_editor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

revoke all on function private.validate_monitoring_plan() from public;
revoke all on function private.stamp_plan_editor() from public;

create trigger monitoring_plans_validate before insert or update on public.monitoring_plans
  for each row execute function private.validate_monitoring_plan();
create trigger monitoring_plans_stamp_editor before insert or update on public.monitoring_plans
  for each row execute function private.stamp_plan_editor();

create policy monitoring_plans_select on public.monitoring_plans for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy monitoring_plans_insert on public.monitoring_plans for insert to authenticated
  with check (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy monitoring_plans_update on public.monitoring_plans for update to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id))
  with check (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
