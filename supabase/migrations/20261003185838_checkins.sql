-- Daily check-ins (US-02): one check-in per patient-local day, one entry per symptom.
-- The patient owns them; the care team can read them.

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, day)
);
alter table public.checkins enable row level security;

create trigger checkins_set_updated_at before update on public.checkins
  for each row execute function private.set_updated_at();

create table public.checkin_entries (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  symptom_code text references public.symptom_catalog (code),
  custom_label text check (char_length(custom_label) between 1 and 60),
  severity smallint not null check (severity between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((symptom_code is null) <> (custom_label is null)),
  unique (checkin_id, symptom_code),
  unique (checkin_id, custom_label)
);
alter table public.checkin_entries enable row level security;
create index checkin_entries_checkin_id_idx on public.checkin_entries (checkin_id);

create trigger checkin_entries_set_updated_at before update on public.checkin_entries
  for each row execute function private.set_updated_at();

create policy checkins_select on public.checkins for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy checkins_insert_own on public.checkins for insert to authenticated
  with check (patient_id = (select auth.uid()));
create policy checkins_update_own on public.checkins for update to authenticated
  using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));
create policy checkins_delete_own on public.checkins for delete to authenticated
  using (patient_id = (select auth.uid()));

-- Entries inherit ownership from their parent check-in.
create policy checkin_entries_select on public.checkin_entries for select to authenticated
  using (exists (
    select 1 from public.checkins c
    where c.id = checkin_id
      and (c.patient_id = (select auth.uid()) or private.is_care_team(c.patient_id))
  ));
create policy checkin_entries_insert_own on public.checkin_entries for insert to authenticated
  with check (exists (
    select 1 from public.checkins c where c.id = checkin_id and c.patient_id = (select auth.uid())
  ));
create policy checkin_entries_update_own on public.checkin_entries for update to authenticated
  using (exists (
    select 1 from public.checkins c where c.id = checkin_id and c.patient_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.checkins c where c.id = checkin_id and c.patient_id = (select auth.uid())
  ));
create policy checkin_entries_delete_own on public.checkin_entries for delete to authenticated
  using (exists (
    select 1 from public.checkins c where c.id = checkin_id and c.patient_id = (select auth.uid())
  ));
