-- Smoke checks for the schema + RLS foundation. Runs in one transaction and rolls back,
-- so it is safe against the hosted DB. Any failed check raises and aborts the run.
-- Run via the Supabase MCP `execute_sql`, or `psql -f supabase/tests/smoke.sql`.

begin;

-- Fixtures (as the owner role) --------------------------------------------------
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@smoke.test', '{"role":"clinician"}'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@smoke.test', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'doc@smoke.test', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'doc2@smoke.test', '{}');
update public.profiles set role = 'clinician'
  where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d');
insert into public.checkins (patient_id, day) values
  ('00000000-0000-0000-0000-00000000000b', current_date);

do $$
begin
  -- RLS is on for every public table.
  if exists (select 1 from pg_tables where schemaname = 'public' and not rowsecurity) then
    raise exception 'FAIL: public table without RLS';
  end if;
  -- Signup metadata cannot grant the clinician role.
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 'patient' then
    raise exception 'FAIL: metadata escalated role';
  end if;
  -- Severity and code/label CHECKs.
  begin
    insert into public.checkin_entries (checkin_id, symptom_code, severity)
      select id, 'sleep', 6 from public.checkins limit 1;
    raise exception 'FAIL: severity 6 accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.checkin_entries (checkin_id, symptom_code, custom_label, severity)
      select id, 'sleep', 'x', 2 from public.checkins limit 1;
    raise exception 'FAIL: code and label both accepted';
  exception when check_violation then null;
  end;
  -- Plan codes must exist in the catalog.
  begin
    insert into public.monitoring_plans (patient_id, symptom_codes)
      values ('00000000-0000-0000-0000-00000000000b', '{sleep,not_a_symptom}');
    raise exception 'FAIL: unknown plan code accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

-- As patient A --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
begin
  if exists (select 1 from public.checkins where patient_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'FAIL: patient A sees patient B check-ins';
  end if;
  begin
    update public.profiles set role = 'clinician' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: patient changed own role';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (patient_id, role, content, local_date)
      values ('00000000-0000-0000-0000-00000000000a', 'assistant', 'hi', current_date);
    raise exception 'FAIL: patient inserted assistant message';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.observations (patient_id, observed_on, symptom_code, source)
      values ('00000000-0000-0000-0000-00000000000a', current_date, 'sleep', 'chat');
    raise exception 'FAIL: patient inserted observation';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Patient B creates a link code; stash it for the clinician.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select set_config('smoke.code', (select code from public.create_link_code()), true);

-- Anonymous clinician-looking caller cannot redeem.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":true}';
do $$
begin
  perform public.redeem_link_code(current_setting('smoke.code'));
  raise exception 'FAIL: anonymous caller redeemed a code';
exception when insufficient_privilege then null;
end $$;

-- Clinician C: no access before linking, redeem once, then read-only access.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.checkins) then
    raise exception 'FAIL: unlinked clinician sees check-ins';
  end if;
  if public.redeem_link_code(current_setting('smoke.code')) is distinct from '00000000-0000-0000-0000-00000000000b'::uuid then
    raise exception 'FAIL: valid code not redeemed';
  end if;
  if public.redeem_link_code(current_setting('smoke.code')) is not null then
    raise exception 'FAIL: code redeemed twice';
  end if;
  if not exists (select 1 from public.checkins where patient_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'FAIL: linked clinician cannot read check-ins';
  end if;
  update public.checkins set note = 'edited' where patient_id = '00000000-0000-0000-0000-00000000000b';
  if found then
    raise exception 'FAIL: clinician edited a check-in';
  end if;
end $$;

-- Patient B cannot read interviews or insights about themselves.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.interviews) or exists (select 1 from public.insights) then
    raise exception 'FAIL: patient sees doctor-side data';
  end if;
end $$;

select 'all smoke checks passed' as result;

rollback;
