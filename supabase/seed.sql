-- Demo data: patient Anna and clinician Dr Demo, 30 days of history relative to today, one interview.
-- Local: applied by `supabase db reset`. Hosted: run once by hand. Re-running the same day is a no-op;
-- on a later day, first delete both users from auth.users (cascades), or the 30-day shape breaks.
-- Logins: anna@digna.test / DignaDemo2026 and dr.demo@digna.test / DignaDemo2026.
-- The data is shaped so `context-check` on the interview returns exactly three insights:
--   discrepancy (sleep severe on 8 of the last 14 check-ins, interview says it improved),
--   missing_topic (headache on 7 days, never mentioned), significant_change (energy worsens by >= 1.0).

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
       extensions.crypt('DignaDemo2026', extensions.gen_salt('bf')), now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}', '{}', now(), now()
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, 'anna@digna.test'),
  ('00000000-0000-0000-0000-0000000000b1'::uuid, 'dr.demo@digna.test')
) as u(id, email)
on conflict do nothing; -- also skips an existing signup with the same email

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1')
on conflict (provider_id, provider) do nothing;

-- The signup trigger created both profiles as patients. Seeds run as the table owner,
-- so the role guard allows promoting the clinician.
update public.profiles set
  display_name = 'Anna', age_band = '50_54', last_period = '3_12m', hrt_status = 'no',
  timezone = 'Europe/Warsaw', onboarding_completed_at = now()
where id = '00000000-0000-0000-0000-0000000000a1';

update public.profiles set role = 'clinician', display_name = 'Dr Demo'
where id = '00000000-0000-0000-0000-0000000000b1';

insert into public.care_links (patient_id, clinician_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1')
on conflict do nothing;

-- Inserting the answers derives menopause_stage via the onboarding trigger.
insert into public.onboarding_answers (patient_id, question, answer) values
  ('00000000-0000-0000-0000-0000000000a1', 'age_band', '50_54'),
  ('00000000-0000-0000-0000-0000000000a1', 'last_period', '3_12m'),
  ('00000000-0000-0000-0000-0000000000a1', 'hrt_status', 'no'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'hot_flushes'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'night_sweats'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'sleep'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'energy')
on conflict do nothing;

insert into public.monitoring_plans (patient_id, symptom_codes)
values ('00000000-0000-0000-0000-0000000000a1', array['hot_flushes', 'night_sweats', 'sleep', 'energy', 'headache'])
on conflict (patient_id) do update set symptom_codes = excluded.symptom_codes;

-- One check-in per day for the last 30 days (n = days ago).
insert into public.checkins (patient_id, day, note)
select '00000000-0000-0000-0000-0000000000a1', current_date - n,
       case when n in (2, 8, 13) then 'Slept badly, awake from 3am.' when n in (12, 22) then 'Headache by the afternoon.' end
from generate_series(1, 30) as n
on conflict (patient_id, day) do nothing;

-- hot_flushes / night_sweats: steady 2-3. sleep: 4 on 8 of the last 14 days, else 2.
-- energy: mean 1.5 in days 16-30, 3.0 in days 1-15. headache: 2-3 on 7 days, else 1.
insert into public.checkin_entries (checkin_id, symptom_code, severity)
select c.id, s.code, (case s.code
         when 'hot_flushes' then 2 + n % 2
         when 'night_sweats' then 2 + (n + 1) % 2
         when 'sleep' then case when n <= 14 and n % 7 in (1, 2, 4, 6) then 4 else 2 end
         when 'energy' then case when n <= 15 then 2 + 2 * (n % 2) else 1 + n % 2 end
         else case when n in (3, 6, 9, 12, 18, 22, 27) then 2 + n % 2 else 1 end
       end)::smallint
from public.checkins c
cross join lateral (select current_date - c.day as n) as d
cross join (values ('hot_flushes'), ('night_sweats'), ('sleep'), ('energy'), ('headache')) as s(code)
where c.patient_id = '00000000-0000-0000-0000-0000000000a1'
on conflict do nothing;

insert into public.chat_messages (id, patient_id, role, content, local_date) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'user',
   'I keep waking up around 3am drenched in sweat.', current_date - 2),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a1', 'assistant',
   'That sounds exhausting. I added night sweats to your day.', current_date - 2)
on conflict (id) do nothing;

insert into public.observations (patient_id, observed_on, symptom_code, severity, duration_days, source, source_message_id)
select '00000000-0000-0000-0000-0000000000a1', current_date - 2, 'night_sweats', 4, 14, 'chat',
       '00000000-0000-0000-0000-00000000c001'
where not exists (
  select 1 from public.observations where source_message_id = '00000000-0000-0000-0000-00000000c001'
);

insert into public.wearable_connections (patient_id, provider)
values ('00000000-0000-0000-0000-0000000000a1', 'apple_health')
on conflict do nothing;

insert into public.wearable_nights (patient_id, night_of, provider, sleep_minutes, awakenings, resting_hr, skin_temp_delta_c, warm_at)
select '00000000-0000-0000-0000-0000000000a1', current_date - n, 'apple_health',
       330 + (n * 13) % 120, 1 + n % 4, 58 + n % 9, round((0.2 + (n % 6) * 0.2)::numeric, 1), time '03:10'
from generate_series(1, 30) as n
on conflict (patient_id, night_of, provider) do nothing;

-- Today's visit (a real v4 id: context-check validates it with zod's strict uuid). `extracted` is pre-filled so context-check skips the LLM extraction.
insert into public.interviews (id, patient_id, clinician_id, visit_at, kind, content, extracted)
values (
  '6f1c2a4e-8b3d-4c7a-9e21-0d5b7a3c9f10', '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000b1', now(), 'note',
  'Hot flushes several times a day, night sweats most nights. Sleep is better now. Feels low on energy.',
  '{"mentions":[
    {"symptom_code":"hot_flushes","custom_label":null,"stance":"present","quote":"Hot flushes several times a day"},
    {"symptom_code":"night_sweats","custom_label":null,"stance":"present","quote":"night sweats most nights"},
    {"symptom_code":"sleep","custom_label":null,"stance":"improved","quote":"Sleep is better now"},
    {"symptom_code":"energy","custom_label":null,"stance":"present","quote":"Feels low on energy"}
  ]}'
)
on conflict (id) do nothing;
