-- Server-side menopause stage. The stage is derived from the onboarding answers, so
-- clients only write answers and read profiles.menopause_stage.
--
-- Rules (STRAW+10: menopause = 12 months without a period; NICE NG23: clinical
-- diagnosis from period history and symptoms, harder on hormone therapy):
--   gt_12m  -> menopause, or postmenopause from age 55
--   3_12m   -> perimenopause
--   lt_3m   -> perimenopause if age 45+ or any symptom was chosen
--   unsure  -> perimenopause only at 45-54 with hot flushes / night sweats
--   hrt = yes, with a recent or unsure last period -> unknown (HRT bleeding is unreliable)
-- Missing age or last period -> null (not decided yet).

-- Single-choice questions hold exactly one valid answer; only symptoms can have many rows.
alter table public.onboarding_answers
  add constraint onboarding_answers_value_check check (
    case question
      when 'age_band' then answer in ('40_44', '45_49', '50_54', '55_59', '60_plus')
      when 'last_period' then answer in ('lt_3m', '3_12m', 'gt_12m', 'unsure')
      when 'hrt_status' then answer in ('yes', 'no', 'unsure')
      else true
    end
  );
create unique index onboarding_answers_single_choice_idx
  on public.onboarding_answers (patient_id, question)
  where question <> 'symptoms';

create or replace function private.infer_menopause_stage(
  p_age_band text,
  p_last_period text,
  p_hrt_status text,
  p_symptoms text[]
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_age_band is null or p_last_period is null then null
    when p_last_period = 'gt_12m' then
      case when p_age_band in ('55_59', '60_plus') then 'postmenopause' else 'menopause' end
    when p_hrt_status = 'yes' then 'unknown'
    when p_last_period = '3_12m' then 'perimenopause'
    when p_last_period = 'lt_3m' then
      case
        when p_age_band <> '40_44' or coalesce(cardinality(p_symptoms), 0) > 0 then 'perimenopause'
        else 'unknown'
      end
    else -- 'unsure'
      case
        when p_age_band in ('45_49', '50_54')
          and (p_symptoms && array['hot_flushes', 'night_sweats']) then 'perimenopause'
        else 'unknown'
      end
  end;
$$;

-- Recomputes the stage and mirrors the single-choice answers onto the profile.
create or replace function private.refresh_menopause_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient uuid := coalesce(new.patient_id, old.patient_id);
  v_age text;
  v_period text;
  v_hrt text;
  v_symptoms text[];
begin
  select
    max(answer) filter (where question = 'age_band'),
    max(answer) filter (where question = 'last_period'),
    max(answer) filter (where question = 'hrt_status'),
    coalesce(array_agg(answer) filter (where question = 'symptoms'), '{}')
  into v_age, v_period, v_hrt, v_symptoms
  from public.onboarding_answers
  where patient_id = v_patient;

  update public.profiles set
    age_band = v_age,
    last_period = v_period,
    hrt_status = v_hrt,
    menopause_stage = private.infer_menopause_stage(v_age, v_period, v_hrt, v_symptoms)
  where id = v_patient;

  return null;
end;
$$;

create trigger onboarding_answers_refresh_stage
  after insert or update or delete on public.onboarding_answers
  for each row execute function private.refresh_menopause_stage();

-- The stage is server-derived: a client update of menopause_stage is ignored.
create or replace function private.guard_profile_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.menopause_stage is distinct from old.menopause_stage
     and current_user in ('authenticated', 'anon') then
    new.menopause_stage := old.menopause_stage;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_stage before update on public.profiles
  for each row execute function private.guard_profile_stage();

revoke all on function private.infer_menopause_stage(text, text, text, text[]) from public;
revoke all on function private.refresh_menopause_stage() from public;
revoke all on function private.guard_profile_stage() from public;
