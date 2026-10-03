-- Read RPCs for the Day detail and Calendar screens (blueprint Step 2).
-- security invoker: RLS applies, and the caller is always auth.uid().
-- Day status (blueprint §0): max severity <=2 good, 3 okay, >=4 hard, no entries none.

create or replace function public.get_calendar_month(p_month date)
returns table (day date, status text, has_bleeding boolean, has_checkin boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as start_day,
      (date_trunc('month', p_month) + interval '1 month')::date as end_day
  ),
  days as (
    select d::date as day
    from bounds b, generate_series(b.start_day, b.end_day - 1, interval '1 day') as d
  ),
  day_entries as (
    select
      c.day,
      max(e.severity) as max_severity,
      bool_or(e.symptom_code = 'bleeding' and e.severity >= 2) as has_bleeding
    from public.checkins c
    join public.checkin_entries e on e.checkin_id = c.id
    join bounds b on c.day >= b.start_day and c.day < b.end_day
    where c.patient_id = (select auth.uid())
    group by c.day
  )
  select
    d.day,
    case
      when de.max_severity is null then 'none'
      when de.max_severity <= 2 then 'good'
      when de.max_severity = 3 then 'okay'
      else 'hard'
    end,
    coalesce(de.has_bleeding, false),
    exists (
      select 1 from public.checkins c
      where c.patient_id = (select auth.uid()) and c.day = d.day
    )
  from days d
  left join day_entries de on de.day = d.day
  order by d.day;
$$;

create or replace function public.get_day(p_day date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'day', p_day,
    'checkin', (
      select jsonb_build_object('id', c.id, 'note', c.note)
      from public.checkins c
      where c.patient_id = (select auth.uid()) and c.day = p_day
    ),
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object('symptom_code', e.symptom_code, 'custom_label', e.custom_label, 'severity', e.severity)
        order by e.created_at
      )
      from public.checkin_entries e
      join public.checkins c on c.id = e.checkin_id
      where c.patient_id = (select auth.uid()) and c.day = p_day
    ), '[]'::jsonb),
    'observations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'symptom_code', o.symptom_code,
          'custom_label', o.custom_label,
          'severity', o.severity,
          'duration_days', o.duration_days,
          'details', o.details,
          'source', o.source,
          'source_message_id', o.source_message_id
        )
        order by o.created_at
      )
      from public.observations o
      where o.patient_id = (select auth.uid()) and o.observed_on = p_day
    ), '[]'::jsonb),
    'chat_messages', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', m.id, 'content', m.content, 'input_mode', m.input_mode, 'created_at', m.created_at)
        order by m.created_at
      )
      from public.chat_messages m
      where m.patient_id = (select auth.uid()) and m.role = 'user' and m.local_date = p_day
    ), '[]'::jsonb),
    -- Nights are keyed by night_of = p_day. One entry per provider.
    'wearable_nights', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', w.provider,
          'sleep_minutes', w.sleep_minutes,
          'awakenings', w.awakenings,
          'resting_hr', w.resting_hr,
          'skin_temp_delta_c', w.skin_temp_delta_c,
          'warm_at', w.warm_at
        )
      )
      from public.wearable_nights w
      where w.patient_id = (select auth.uid()) and w.night_of = p_day
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_calendar_month(date) from public, anon;
revoke all on function public.get_day(date) from public, anon;
grant execute on function public.get_calendar_month(date) to authenticated;
grant execute on function public.get_day(date) to authenticated;
