-- Chat with Digna (US-03), observations extracted from it (US-04) and guardrail
-- trips (US-14). Assistant messages, observations and guardrail events are written
-- only by the `chat` edge function with the service role.

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  local_date date not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
-- (patient_id, created_at) also serves the chat function's rate-limit queries.
create index chat_messages_patient_created_idx on public.chat_messages (patient_id, created_at);
create index chat_messages_patient_local_date_idx on public.chat_messages (patient_id, local_date);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  observed_on date not null,
  symptom_code text references public.symptom_catalog (code),
  custom_label text check (char_length(custom_label) between 1 and 60),
  severity smallint check (severity between 1 and 5),
  duration_days int check (duration_days >= 0),
  details jsonb,
  source text not null check (source in ('chat', 'onboarding')),
  source_message_id uuid references public.chat_messages (id) on delete set null,
  created_at timestamptz not null default now(),
  check (symptom_code is not null or custom_label is not null)
);
alter table public.observations enable row level security;
create index observations_patient_observed_idx on public.observations (patient_id, observed_on);
create index observations_source_message_idx on public.observations (source_message_id);

-- No message text is stored, only which rule tripped.
create table public.guardrail_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  rule text not null,
  created_at timestamptz not null default now()
);
alter table public.guardrail_events enable row level security;
create index guardrail_events_patient_created_idx on public.guardrail_events (patient_id, created_at);

-- Patients insert only their own user turns; messages are never edited or deleted.
create policy chat_messages_select on public.chat_messages for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));
create policy chat_messages_insert_user on public.chat_messages for insert to authenticated
  with check (patient_id = (select auth.uid()) and role = 'user');

create policy observations_select on public.observations for select to authenticated
  using (patient_id = (select auth.uid()) or private.is_care_team(patient_id));

-- guardrail_events: no policies (service role only).
