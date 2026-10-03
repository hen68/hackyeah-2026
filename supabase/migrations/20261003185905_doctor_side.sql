-- Doctor side (US-07..US-13): visit interviews, context checks with their insights,
-- and the clinician's feedback. Patients have no access to any of it.
-- context_checks and insights are written by the `context-check` edge function only.

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  clinician_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  visit_at timestamptz not null,
  kind text not null check (kind in ('text', 'transcript', 'note')),
  content text not null check (char_length(content) between 1 and 100000),
  extracted jsonb,
  created_at timestamptz not null default now()
);
alter table public.interviews enable row level security;
create index interviews_patient_visit_idx on public.interviews (patient_id, visit_at);
create index interviews_clinician_idx on public.interviews (clinician_id);

create table public.context_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  check (period_start <= period_end)
);
alter table public.context_checks enable row level security;
create index context_checks_interview_idx on public.context_checks (interview_id);
create index context_checks_patient_idx on public.context_checks (patient_id);

-- patient_id is denormalized from context_checks so policies don't need a join.
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  context_check_id uuid not null references public.context_checks (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('missing_topic', 'discrepancy', 'new_symptom', 'significant_change')),
  symptom_code text references public.symptom_catalog (code),
  custom_label text,
  title text not null,
  summary text not null,
  rank int not null,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.insights enable row level security;
create index insights_context_check_idx on public.insights (context_check_id);
create index insights_patient_idx on public.insights (patient_id);

-- Kept for later system improvement; the app never deletes it.
create table public.insight_feedback (
  insight_id uuid primary key references public.insights (id) on delete cascade,
  clinician_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  decision text not null check (decision in ('asked', 'already_discussed', 'not_relevant')),
  created_at timestamptz not null default now()
);
alter table public.insight_feedback enable row level security;
create index insight_feedback_clinician_idx on public.insight_feedback (clinician_id);

create policy interviews_select_care on public.interviews for select to authenticated
  using (private.is_care_team(patient_id));
create policy interviews_insert_care on public.interviews for insert to authenticated
  with check (private.is_care_team(patient_id) and clinician_id = (select auth.uid()));

create policy context_checks_select_care on public.context_checks for select to authenticated
  using (private.is_care_team(patient_id));
create policy insights_select_care on public.insights for select to authenticated
  using (private.is_care_team(patient_id));

create policy insight_feedback_select_care on public.insight_feedback for select to authenticated
  using (exists (
    select 1 from public.insights i where i.id = insight_id and private.is_care_team(i.patient_id)
  ));
create policy insight_feedback_insert_care on public.insight_feedback for insert to authenticated
  with check (
    clinician_id = (select auth.uid())
    and exists (
      select 1 from public.insights i where i.id = insight_id and private.is_care_team(i.patient_id)
    )
  );
create policy insight_feedback_update_care on public.insight_feedback for update to authenticated
  using (exists (
    select 1 from public.insights i where i.id = insight_id and private.is_care_team(i.patient_id)
  ))
  with check (
    clinician_id = (select auth.uid())
    and exists (
      select 1 from public.insights i where i.id = insight_id and private.is_care_team(i.patient_id)
    )
  );
