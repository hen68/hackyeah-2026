-- Smartwatch connections and nightly summaries synced from the device.
-- The patient owns them; the care team can read them.

create table public.wearable_connections (
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('apple_health', 'health_connect', 'garmin', 'fitbit')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  primary key (patient_id, provider)
);
alter table public.wearable_connections enable row level security;

create table public.wearable_nights (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  night_of date not null,
  provider text not null check (provider in ('apple_health', 'health_connect', 'garmin', 'fitbit')),
  sleep_minutes int check (sleep_minutes between 0 and 1440),
  awakenings int check (awakenings >= 0),
  resting_hr int check (resting_hr between 20 and 250),
  skin_temp_delta_c numeric(3, 1),
  warm_at time,
  created_at timestamptz not null default now(),
  unique (patient_id, night_of, provider)
);
alter table public.wearable_nights enable row level security;
create index wearable_nights_patient_night_idx on public.wearable_nights (patient_id, night_of);

create policy wearable_connections_select on public.wearable_connections for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy wearable_connections_insert_own on public.wearable_connections for insert to authenticated
  with check (patient_id = (select auth.uid()));
create policy wearable_connections_update_own on public.wearable_connections for update to authenticated
  using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));
create policy wearable_connections_delete_own on public.wearable_connections for delete to authenticated
  using (patient_id = (select auth.uid()));

create policy wearable_nights_select on public.wearable_nights for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy wearable_nights_insert_own on public.wearable_nights for insert to authenticated
  with check (patient_id = (select auth.uid()));
create policy wearable_nights_update_own on public.wearable_nights for update to authenticated
  using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));
create policy wearable_nights_delete_own on public.wearable_nights for delete to authenticated
  using (patient_id = (select auth.uid()));
