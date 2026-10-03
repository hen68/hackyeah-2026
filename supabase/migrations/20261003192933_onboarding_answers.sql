-- Onboarding answers (one row per answer). Multi-select questions such as symptoms
-- get one row per selected option. Re-answering a question is delete-then-insert,
-- so there is no update policy.

create table public.onboarding_answers (
  patient_id uuid not null references public.profiles (id) on delete cascade,
  question text not null check (question in ('age_band', 'last_period', 'hrt_status', 'symptoms')),
  answer text not null check (char_length(answer) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (patient_id, question, answer)
);
alter table public.onboarding_answers enable row level security;

create policy onboarding_answers_select on public.onboarding_answers for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy onboarding_answers_insert_own on public.onboarding_answers for insert to authenticated
  with check (patient_id = (select auth.uid()));
create policy onboarding_answers_delete_own on public.onboarding_answers for delete to authenticated
  using (patient_id = (select auth.uid()));
