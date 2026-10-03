-- Care team: patient ↔ clinician links, created by redeeming a short-lived one-time code.
-- Neither table is reachable directly; clients go through the RPCs below.

create table public.care_links (
  patient_id uuid not null references public.profiles (id) on delete cascade,
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (patient_id, clinician_id)
);
alter table public.care_links enable row level security;
create index care_links_clinician_idx on public.care_links (clinician_id);

create table public.link_codes (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz,
  failed_attempts int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.link_codes enable row level security;
create index link_codes_patient_idx on public.link_codes (patient_id);

-- True when the caller is a clinician linked to the patient. Used by every care-team policy.
create or replace function private.is_care_team(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_links l
    join public.profiles p on p.id = l.clinician_id
    where l.patient_id = p_patient
      and l.clinician_id = (select auth.uid())
      and p.role = 'clinician'
  );
$$;

revoke all on function private.is_care_team(uuid) from public;
grant execute on function private.is_care_team(uuid) to authenticated;

create policy profiles_select_care on public.profiles for select to authenticated
  using (private.is_care_team(id));

-- Link codes ---------------------------------------------------------------------

create or replace function private.random_link_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- No I, O, 0, 1 so the code reads unambiguously.
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Patient generates a code; any previous unused code is invalidated.
create or replace function public.create_link_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
begin
  if v_uid is null or not private.current_role_is('patient') then
    raise exception 'only patients can create a link code' using errcode = '42501';
  end if;

  delete from public.link_codes l where l.patient_id = v_uid and l.used_at is null;

  loop
    v_code := private.random_link_code();
    begin
      insert into public.link_codes (code, patient_id) values (v_code, v_uid);
      exit;
    exception when unique_violation then
      -- extremely unlikely collision; try another code
    end;
  end loop;

  return query
    select l.code, l.expires_at from public.link_codes l where l.code = v_code;
end;
$$;

-- Clinician redeems a code. Returns the patient id, or null for any invalid code
-- (null instead of an error so the failed-attempt counter isn't rolled back).
create or replace function public.redeem_link_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(trim(coalesce(p_code, '')));
  v_row public.link_codes;
begin
  if v_uid is null or private.is_anonymous() or not private.current_role_is('clinician') then
    raise exception 'only clinicians can redeem a link code' using errcode = '42501';
  end if;

  select * into v_row from public.link_codes l where l.code = v_code for update;

  if not found
     or v_row.used_at is not null
     or v_row.expires_at < now()
     or v_row.failed_attempts >= 5
     or v_row.patient_id = v_uid then
    -- Count near-misses against codes sharing the prefix, so guessing locks them out.
    update public.link_codes l
      set failed_attempts = l.failed_attempts + 1
      where l.used_at is null
        and left(l.code, 4) = left(v_code, 4)
        and l.code <> v_code;
    return null;
  end if;

  update public.link_codes set used_at = now() where code = v_row.code;
  insert into public.care_links (patient_id, clinician_id)
    values (v_row.patient_id, v_uid)
    on conflict do nothing;

  return v_row.patient_id;
end;
$$;

revoke all on function private.random_link_code() from public;
revoke all on function public.create_link_code() from public, anon;
revoke all on function public.redeem_link_code(text) from public, anon;
grant execute on function public.create_link_code() to authenticated;
grant execute on function public.redeem_link_code(text) to authenticated;
