-- Demo data for local development (`supabase db reset`). Not applied to the hosted project.
-- One patient with 30 days of history, linked to one clinician. Dates are relative to today.
-- Demo logins have no password; sign in locally through the OTP email (Inbucket) or the service role.

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.patient@digna.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo.clinician@digna.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

-- The signup trigger created both profiles as patients. Seeds run as the table owner,
-- so the role guard allows promoting the clinician.
update public.profiles set
  display_name = 'Anna',
  age_band = '50_54', last_period = '3_12m', hrt_status = 'no', menopause_stage = 'perimenopause',
  timezone = 'Europe/Warsaw', onboarding_completed_at = now()
where id = '00000000-0000-0000-0000-0000000000a1';

update public.profiles set role = 'clinician', display_name = 'Dr. Nowak'
where id = '00000000-0000-0000-0000-0000000000b1';

insert into public.care_links (patient_id, clinician_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1')
on conflict do nothing;

insert into public.onboarding_answers (patient_id, question, answer) values
  ('00000000-0000-0000-0000-0000000000a1', 'age_band', '50_54'),
  ('00000000-0000-0000-0000-0000000000a1', 'last_period', '3_12m'),
  ('00000000-0000-0000-0000-0000000000a1', 'hrt_status', 'no'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'hot_flushes'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'night_sweats'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'sleep'),
  ('00000000-0000-0000-0000-0000000000a1', 'symptoms', 'mood')
on conflict do nothing;

insert into public.monitoring_plans (patient_id, symptom_codes)
values ('00000000-0000-0000-0000-0000000000a1', array['hot_flushes', 'night_sweats', 'sleep', 'mood', 'bleeding'])
on conflict (patient_id) do update set symptom_codes = excluded.symptom_codes;

-- Check-ins for the last 30 days, skipping every 5th day. Hot flushes and sweats worsen in the
-- second half so there is a visible change. Bleeding appears on a few days.
insert into public.checkins (patient_id, day, note)
select '00000000-0000-0000-0000-0000000000a1', current_date - n,
       case when n % 7 = 0 then 'Slept badly, woke up hot.' end
from generate_series(1, 30) as n
where n % 5 <> 0
on conflict (patient_id, day) do nothing;

insert into public.checkin_entries (checkin_id, symptom_code, severity)
select c.id, s.code,
       least(5, greatest(1, case
         when s.code = 'bleeding' then case when (current_date - c.day) in (3, 4, 17) then 3 else 1 end
         when (current_date - c.day) % 4 = 1 then 1 + s.idx % 2
         when s.code in ('hot_flushes', 'night_sweats') then 1 + ((current_date - c.day + s.idx) % 3) + case when (current_date - c.day) <= 15 then 1 else 0 end
         else 1 + ((current_date - c.day) * 2 + s.idx) % 3
       end))::smallint
from public.checkins c
cross join (values ('hot_flushes', 1), ('night_sweats', 2), ('sleep', 3), ('mood', 4), ('bleeding', 5)) as s(code, idx)
where c.patient_id = '00000000-0000-0000-0000-0000000000a1'
on conflict do nothing;

insert into public.chat_messages (id, patient_id, role, content, local_date) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'user',
   'I keep waking up around 3am drenched in sweat.', current_date - 2),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a1', 'assistant',
   'That sounds exhausting. I added night sweats to your day.', current_date - 2)
on conflict (id) do nothing;

insert into public.observations (patient_id, observed_on, symptom_code, severity, duration_days, source, source_message_id)
values ('00000000-0000-0000-0000-0000000000a1', current_date - 2, 'night_sweats', 4, 14, 'chat',
        '00000000-0000-0000-0000-00000000c001');

insert into public.wearable_connections (patient_id, provider)
values ('00000000-0000-0000-0000-0000000000a1', 'apple_health')
on conflict do nothing;

insert into public.wearable_nights (patient_id, night_of, provider, sleep_minutes, awakenings, resting_hr, skin_temp_delta_c, warm_at)
select '00000000-0000-0000-0000-0000000000a1', current_date - n, 'apple_health',
       330 + (n * 13) % 120, 1 + n % 4, 58 + n % 9, round((0.2 + (n % 6) * 0.2)::numeric, 1), time '03:10'
from generate_series(1, 14) as n
on conflict (patient_id, night_of, provider) do nothing;
