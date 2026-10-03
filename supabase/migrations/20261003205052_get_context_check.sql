-- Doctor-side read: one context check with its ranked insights and the clinician's feedback.
-- security invoker, so RLS decides who sees it: only the patient's care team gets rows.

create or replace function public.get_context_check(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'context_check', jsonb_build_object(
      'id', cc.id,
      'interview_id', cc.interview_id,
      'patient_id', cc.patient_id,
      'period_start', cc.period_start,
      'period_end', cc.period_end,
      'created_at', cc.created_at
    ),
    'insights', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'kind', i.kind,
          'symptom_code', i.symptom_code,
          'custom_label', i.custom_label,
          'title', i.title,
          'summary', i.summary,
          'rank', i.rank,
          'evidence', i.evidence,
          'feedback', f.decision
        )
        order by i.rank
      )
      from public.insights i
      left join public.insight_feedback f on f.insight_id = i.id
      where i.context_check_id = cc.id
    ), '[]'::jsonb)
  )
  from public.context_checks cc
  where cc.id = p_id;
$$;

revoke all on function public.get_context_check(uuid) from public, anon;
grant execute on function public.get_context_check(uuid) to authenticated;
