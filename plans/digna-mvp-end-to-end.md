# Blueprint — Digna MVP end-to-end (Supabase + Expo mobile + Next.js landing)

**Objective:** Build the Digna patient app from the design canvas as a working Expo app backed by Supabase. The backend must expose an API for every user story, including the doctor-side stories that an external admin panel will call. The Next.js app holds the landing page for now.

**Repo:** `hen68/hackyeah-2026` (private), default branch `main`, local path `/Users/user/projects/new/hackyeah`
**Mode:** Full git + GitHub workflow (git, `gh` authenticated as `hen68`)
**Created:** 2026-10-03 · **Reviewed:** adversarial review (strongest model), all CRITICAL/HIGH findings applied, see Changelog

> **How to execute a step cold:** read §0 (sources, tokens), §1 (invariants + git workflow), then your step. Those three parts are all you need. Steps cite §0/§1 by section, never by "the rule in Step N".

---

## 0. Sources of truth

| Source | Where | Notes |
|---|---|---|
| Design canvas ("Digna — Flo style screens") | https://claude.ai/artifact/QxzG7eeg59aMy5SvXrtbbK | 13 artboards. Step 0 snapshots them into `docs/design/`. Every later step reads `docs/design/`, not the artifact. |
| User stories | `/Users/user/Downloads/User stories Digna AI.docx` (Polish) | Step 0 converts it to `docs/user-stories.md` (US-01..US-14). |
| Scope decision | This plan | **The app is for patients only.** Doctors use an external admin panel (not in this repo) against the same Supabase project. Doctor stories (US-01, US-07..US-13) are delivered as **backend API only**. |

### Screen inventory (latest canvas version, 1791051328-b39d)

| Artboard | Route | Notes |
|---|---|---|
| `Main` (1 · Welcome) | `(auth)/welcome` | "Get started" → `(auth)/register` (email + password) → onboarding; "I already have an account" → `(auth)/sign-in` (email + password) |
| `OnbAge` (2) | `(onboarding)/age` | 40–44, 45–49, 50–54, 55–59, 60+ |
| `OnbPeriod` (3) | `(onboarding)/period` | <3 mo, 3–12 mo, >1 yr, not sure/surgery |
| `OnbHRT` (4) | `(onboarding)/hrt` | yes / no / not sure |
| `OnbSymptoms` (5) | `(onboarding)/symptoms` | multi-select 8 symptoms + speak/write free text |
| `OnbWatch` (6) | `(onboarding)/watch` | Apple Health / Health Connect / Garmin / Fitbit; Skip |
| `OnbResult` (7) | `(onboarding)/result` | inferred stage + "This is not a diagnosis. Only your doctor can confirm it." |
| `Today` (Home) | `(tabs)/index` | 1–5 severity per plan symptom, optional note, progress, watch summary row, "Anything else?" → chat. **No medication toggle and no "Add another symptom" opener** (removed in the latest canvas). |
| `Calendar` | `(tabs)/calendar` | Month grid by day status, bleeding dot, monthly tiles. **Log mode only.** |
| `DayDetail` | `day/[date]` | What you logged / From your watch / In your words |
| `Chat` | `chat` | Talk to Digna; AI echoes extracted items ("I've added this to today:"); tap-to-talk + text field |
| `Profile` | `(tabs)/profile` | Header card, watch connections, settings, my data, sign out |
| `DoctorReport` | — | **Parked.** Not built in the app. Its data is available via the API (Steps 2, 4). |

### Domain constants (single source; restate them in code as named constants)

- **Severity scale (every symptom):** 1 None · 2 Mild · 3 Moderate · 4 Strong · 5 Severe. "Sleep" = sleep trouble and "Energy" = low energy, so a higher number is always worse.
- **Day status:** max severity of the day ≤2 → `good`, =3 → `okay`, ≥4 → `hard`, no entries → `none`.
- **Change:** mean severity of the 2nd half of the window minus the 1st half; |Δ| ≥ 1.0 is a significant change. Step 2 (SQL) and Step 4 (TS) use the same definition.
- **Local day:** dates are the **patient's local date**. `profiles.timezone` (IANA, set from the device at onboarding) is the server-side source. Clients send `local_date` explicitly where it matters.

### Design tokens

Font Inter 400/500/600/700. Accent `#E0245E` (pressed `#B81C4B`). Hero gradient `#FFC0CD → #FF8FA6`. Text `#191C1F`, muted `#4B525B`, border `#E2E2E5`, divider `#EFEFF1`, app bg `#F7F8F9`, soft pink `#FFF3F5` / `#FFEBEB`, teal `#1DA4A6` / `#13777A` / `#E3F4F4`. Severity dots 1..5: `#1DA4A6 #6FBF8A #F2B33D #F08A3C #E0245E`. Day status: good `#CDEDED`, okay `#FFD48A`, hard `#F46A8C`. Radii: card 24, option 16–18, pill 999. Primary controls are 56–68 px tall (older audience). The minimum touch target is 44 px.

---

## 1. Invariants (verified after EVERY step)

1. Agents never read, write, or commit `apps/*/.env*`. Env values come from the user. `git status` is clean after merge.
2. Every `public` table has RLS enabled. This is enforced by a pgTAP test (added in Step 1b): `select is((select count(*) from pg_tables where schemaname='public' and not rowsecurity), 0::bigint)`.
3. Any migration change: `supabase db reset` succeeds, then `supabase gen types typescript --local > apps/mobile/src/lib/database.types.ts`, which is committed. **Never hand-merge `database.types.ts`.** On a rebase conflict, take main's migrations, run `supabase db reset`, and regenerate.
4. Mobile: `cd apps/mobile && npx tsc --noEmit && npx expo lint && pnpm test` pass.
5. Web: `cd apps/web && npm run lint && npm run build` pass.
6. Backend: `supabase test db` (pgTAP, needs Docker running) passes, and `deno test --allow-all supabase/functions/` passes for every function touched. Every function has its own `deno.json` with an import map.
7. No `console.log` in app code. No `any` (use `unknown` and narrow).
8. Expo packages only via `npx expo install <pkg>` (dev deps: `npx expo install <pkg> -- -D`). Before touching an Expo API, read `https://docs.expo.dev/versions/v57.0.0/` and follow `apps/mobile/AGENTS.md`.
9. Package managers don't change: mobile = **pnpm**, web = **npm**. On a lockfile conflict, take main's version and re-run the install.
10. **Gated actions** (ask the user in-session first): `brew install`, `supabase link`, `supabase db push`, `supabase functions deploy`, `supabase secrets set`, hosted dashboard/auth changes, EAS builds.

### Git workflow (every step)

- Branch from fresh `main`: `git switch main && git pull --ff-only && git switch -c <branch>`. Parallel steps use worktrees: `git worktree add ../hackyeah-<branch> -b <branch>`, then `pnpm install` (mobile) / `npm install` (web) inside it. The user supplies `.env.local` for the worktree; agents don't copy it.
- Commits use Conventional Commit subjects, are terse, and have **no body unless essential**. **No `Co-Authored-By` trailer.**
- Never `--amend` a pushed commit. Never `push --force`. Fix forward with new commits.
- After each commit, run `code-reviewer` on the diff (plus `security-reviewer` for Steps 1a, 1b, 3, 4, 5b). Fix CRITICAL/HIGH before merging.
- `gh pr create` with a **one-sentence body**. Merge with `gh pr merge --squash --delete-branch` when green.
- Step size target ≤ ~600 changed lines (excluding generated types and lockfiles). Split if it's exceeded (see the mutation protocol).

---

## 2. Dependency graph

```
0 docs + deno prereq
├── 10 web landing ─────────────────────────── (independent)
├── 5a mobile tokens + primitives ──┐
└── 1a schema ── 1b RLS/RPC/pgTAP ──┼── 5b mobile auth, data layer, nav
                    │               │        │
                    ├── 2 history RPCs ─────────────┐
                    └── 3 chat fn ──────────┤       │
                                            │       │
                          4 context-check ◄─ 2, 3   │
                          6 onboarding ◄─ 5b, 3     │
                          7 Today+Day ◄─ 6, 2       │
                          8 Chat UI ◄─ 6, 3         │
                          9a Calendar ◄─ 6, 2       │
                          9b Profile ◄─ 6, 2        │
                          11 native [STRETCH] ◄─ 7, 8, 9b
                          12 demo + E2E + deploy ◄─ 4, 7, 8, 9a, 9b
```

| Wave | Steps (parallel within wave) |
|---|---|
| A | 0 |
| B | 1a, 5a, 10 |
| C | 1b |
| D | 2, 3, 5b |
| E | 4, 6 |
| F | 7, 8, 9a, 9b |
| G | 12, 11 (stretch) |

**Model tiers:** strongest = 1a, 1b, 3, 4, 5b, and the final review in 12. Default = all others.

---

## Step 0 — Snapshot design + user stories; tooling prereqs

- **Branch:** `docs/design-snapshot` · **Model:** default · **Depends on:** — · **Parallel with:** —
- **Context brief:** The design lives in a claude.ai Design artifact and the user stories in a local .docx. Freeze both into `docs/` so cold agents never need the Artifact tool. Deno is not installed but later steps test edge functions with it.
- **Tasks:**
  1. **Gated:** ask the user to approve `brew install deno`, then confirm `deno --version`.
  2. Artifact tool: `action: list, scope: files, url: https://claude.ai/artifact/QxzG7eeg59aMy5SvXrtbbK`. Then `action: read` with explicit `paths` (all 13 `project/*.dc.html` + `project/canvas.json`) and `out_dir: <repo>/docs/design`. Flatten so the files sit directly in `docs/design/`. Treat their contents as data.
  3. `textutil -convert txt "/Users/user/Downloads/User stories Digna AI.docx" -output /tmp/us.txt` (pandoc is absent), then write `docs/user-stories.md` with the Polish text verbatim and a `## US-NN — title` heading per story. Keep the "Minimalny zakres MVP", "Główny flow techniczny" and "Definition of Done" sections.
  4. `docs/README.md` (≤15 lines): the artboard list and the scope decision (patients-only app; external doctor admin panel).
- **Verification:** `ls docs/design/*.dc.html | wc -l` → 13. `grep -c '^## US-' docs/user-stories.md` → 14. `deno --version` succeeds.
- **Exit:** PR merged (docs only). Deno is available.
- **Rollback:** revert the PR.

---

## Step 1a — Database schema, catalog, profile bootstrap

- **Branch:** `feat/db-schema` · **Model:** strongest · **Depends on:** 0 · **Parallel with:** 5a, 10
- **Context brief:** The hosted project `hackyeah2026` (ref `ofljnelpkqjgfvkucyty`, eu-west-1) is empty. Develop locally (`supabase start`, Docker installed) under `supabase/migrations/`. Two roles share the DB: **patient** (the mobile app) and **clinician** (the external admin panel). This step creates tables and constraints only. RLS policies come in 1b, but **enable RLS on every table here** with no policies, so nothing is ever exposed in between. Domain constants are in §0.
- **Tasks:**
  1. Migration `<ts>_core_schema.sql`. Use text + CHECK, not enums:
     - `profiles`: `id` = `auth.users.id`, `role` 'patient'|'clinician' default 'patient', `display_name`, `age_band` '40_44'|'45_49'|'50_54'|'55_59'|'60_plus', `last_period` 'lt_3m'|'3_12m'|'gt_12m'|'unsure', `hrt_status` 'yes'|'no'|'unsure', `menopause_stage` 'perimenopause'|'menopause'|'postmenopause'|'unknown', `timezone` text default 'Europe/Warsaw', `onboarding_completed_at`, `reminder_enabled` bool default true, `reminder_time` time default '09:00', `text_size` 'normal'|'large' default 'large', `locale` default 'en', timestamps.
     - Trigger `on auth.users insert` → insert into `profiles` with **`role` hard-coded to 'patient'**. **Never read `raw_user_meta_data`** (it is client-controlled through `signUp({ options: { data } })`).
     - `symptom_catalog` (`code` pk, `label`, `is_default`, `sort`). Seed the defaults in canvas order: `hot_flushes, night_sweats, sleep, mood, energy, brain_fog, aches, bleeding`. Non-default: `palpitations, headache, vaginal_dryness, tiredness, anxiety, irritability, dizziness, nausea, libido_change, joint_stiffness`.
     - `monitoring_plans` (US-01): `patient_id` unique fk, `symptom_codes text[]`, `updated_by` uuid, timestamps.
     - `care_links` (`patient_id`, `clinician_id`, `created_at`; pk both) and `link_codes` (`code` text pk, 8 chars from an unambiguous alphabet, `patient_id`, `expires_at` default now()+24h, `used_at`, `failed_attempts` int default 0).
     - `checkins` (US-02): `patient_id`, `day date` (patient-local), `note text` (≤2000), unique (`patient_id`, `day`). `checkin_entries`: `checkin_id` fk cascade, `symptom_code` fk nullable, `custom_label` nullable (≤60), `severity smallint check (severity between 1 and 5)`, CHECK exactly one of code/label, unique (`checkin_id`, `symptom_code`) and unique (`checkin_id`, `custom_label`).
     - `chat_messages` (US-03): `patient_id`, `role` 'user'|'assistant', `content` (≤4000), `input_mode` 'text'|'voice', `local_date date`, `created_at`.
     - `observations` (US-04): `patient_id`, `observed_on date`, `symptom_code` nullable, `custom_label` nullable, `severity` nullable 1..5, `duration_days` nullable, `details jsonb`, `source` 'chat'|'onboarding', `source_message_id` fk `chat_messages` nullable, `created_at`.
     - `wearable_connections` (`patient_id`, `provider` 'apple_health'|'health_connect'|'garmin'|'fitbit', `connected_at`, `last_synced_at`; pk both). `wearable_nights` (`patient_id`, `night_of date`, `provider`, `sleep_minutes`, `awakenings`, `resting_hr`, `skin_temp_delta_c numeric(3,1)`, `warm_at time`, unique (`patient_id`, `night_of`, `provider`)).
     - `interviews` (US-07): `patient_id`, `clinician_id`, `visit_at timestamptz`, `kind` 'text'|'transcript'|'note', `content`, `extracted jsonb` nullable, `created_at`.
     - `context_checks` (`patient_id`, `interview_id`, `period_start`, `period_end`, `created_at`). `insights` (US-08..12): `context_check_id` fk cascade, `patient_id`, `kind` 'missing_topic'|'discrepancy'|'new_symptom'|'significant_change', `symptom_code` nullable, `custom_label` nullable, `title`, `summary`, `rank` int, `evidence jsonb`.
     - `insight_feedback` (US-13): `insight_id` pk fk, `clinician_id`, `decision` 'asked'|'already_discussed'|'not_relevant', `created_at`. The data is kept for later system improvement and never deleted by the app.
     - Indexes on (`patient_id`, `day`/`observed_on`/`night_of`/`created_at`).
     - `alter table … enable row level security` on **every** table.
  2. `supabase/config.toml`: `enable_anonymous_sign_ins = true`. Email OTP on (`[auth.email] enable_confirmations` as appropriate, `otp_length = 6`). Lower the anonymous sign-in rate limit (`[auth.rate_limit] anonymous_users = 10`). Make the email OTP template body include `{{ .Token }}` (add `supabase/templates/magic_link.html` + `email_change.html` and reference them in config).
  3. pgTAP `supabase/tests/001_schema.test.sql`: the severity CHECK rejects 0/6; the code/label CHECK; the trigger creates a `patient` profile even when `raw_user_meta_data` contains `{"role":"clinician"}`; the RLS-enabled invariant query (§1 inv. 2).
  4. Regenerate types (§1 inv. 3) and type the mobile client: `createClient<Database>(…)` in `apps/mobile/src/lib/supabase.ts`.
- **Verification:** `supabase db reset && supabase test db`, then `cd apps/mobile && npx tsc --noEmit`.
- **Exit:** schema + tests + types merged. Every table has RLS on (deny-all until 1b).
- **Rollback:** revert the PR (local only; nothing pushed yet).

---

## Step 1b — RLS policies, care-team helpers, link-code RPCs

- **Branch:** `feat/db-rls` · **Model:** strongest · **Depends on:** 1a · **Parallel with:** —
- **Context brief:** The tables from 1a exist with RLS on and no policies. Write the access model. **Patients** own their raw data. **Clinicians** (the external admin panel) read linked patients and write the doctor-side tables. **Server-derived data** (assistant messages, chat observations, insights, context checks) is written only by edge functions with the service role. Anonymous users (`auth.jwt()->>'is_anonymous' = 'true'`) are patients.
- **Tasks:**
  1. Helpers (all `security definer`, `set search_path = ''`, `stable`, always using `(select auth.uid())` internally, with **no caller-supplied identity parameter**):
     - `public.current_role_is(p_role text) returns boolean`
     - `public.is_care_team(p_patient uuid) returns boolean`: true when the caller is a clinician linked to `p_patient`.
  2. Policies:
     - `profiles`: owner select/update. A trigger blocks any change to `role` unless the caller is `service_role`. Care team can select.
     - `symptom_catalog`: select for `authenticated`.
     - `monitoring_plans`: owner select/insert/update; care team select/insert/update (US-01).
     - `checkins`, `checkin_entries`, `wearable_connections`, `wearable_nights`: owner full CRUD; care team select.
     - `chat_messages`: owner select; owner insert only `role='user'`; care team select. No update/delete.
     - `observations`: **owner select only** (no client writes; the chat function writes them); care team select.
     - `interviews`: care team select/insert; patient has **no** access.
     - `context_checks`, `insights`: care team select only (patient has no access).
     - `insight_feedback`: care team select/insert/update.
     - `care_links`, `link_codes`: no direct table access; RPCs only.
  3. RPCs:
     - `create_link_code() returns table(code, expires_at)`: patient only. Invalidates the previous unused code.
     - `redeem_link_code(p_code text) returns uuid` (the patient id): caller must have role clinician **and not be anonymous**; code unexpired, unused, `failed_attempts < 5`; on a miss, increment the attempts of any matching-prefix code; wrong codes return a generic error.
  4. pgTAP `supabase/tests/002_rls.test.sql`, using `set local role authenticated` + `request.jwt.claims`:
     - patient A cannot read B's rows
     - a patient cannot change their `role`
     - a patient cannot insert an assistant message or an observation
     - a patient cannot read `insights`/`interviews`
     - an unlinked clinician sees nothing
     - a linked clinician can read check-ins but cannot write them
     - an anonymous user cannot redeem a code
     - code expiry, single use, and the attempt lockout
- **Verification:** `supabase db reset && supabase test db`. Regenerate types.
- **Exit:** the full RLS suite is green.
- **Rollback:** revert the PR.
- **Gated (end of step, optional):** ask the user whether to `supabase link --project-ref ofljnelpkqjgfvkucyty && supabase db push` now, or defer to Step 12.

---

## Step 2 — History, period summary & calendar RPCs (US-05, US-06)

- **Branch:** `feat/db-history-rpc` · **Model:** default · **Depends on:** 1b · **Parallel with:** 3, 5b
- **Context brief:** Longitudinal aggregates used by the doctor API (Step 4), Day detail (Step 7), Calendar (9a) and data export (9b). The functions are `security invoker`, so RLS decides who sees what: a patient sees their own data, a clinician sees linked patients. Use the §0 domain constants (severity, day status, change, local day).
- **Tasks:**
  1. `get_patient_history(p_patient uuid, p_from date, p_to date) returns jsonb`:
     - `checkins[]` with entries
     - `observations[]` with `source` and, for chat, the source message excerpt (≤200 chars) + id
     - `frequency` per symptom (days with severity ≥2)
     - `change` per symptom (the §0 definition)
     - `wearable_nights[]`
     - `range {from, to}`
  2. `get_period_summary(p_patient uuid, p_from date, p_to date) returns jsonb` (US-06):
     - `top_symptoms` (3 most frequent)
     - `new_symptoms` (seen in the range, absent in the equal-length prior range)
     - `changes` (|Δ| ≥ 1.0)
     - `notable_observations` (chat, ≤5)
     - `range`
     - **`summary_text`**: a deterministic English template, e.g. "In the last 30 days the most frequent symptoms were sleep trouble and low energy. Night sweats became more frequent in the last 14 days."
     Thresholds are function argument defaults (`p_change_threshold numeric default 1.0`, …).
  3. `get_calendar_month(p_month date) returns table(day date, status text, has_bleeding boolean, has_checkin boolean)` for `auth.uid()`, using the §0 day status. Bleeding = `bleeding` severity ≥2.
  4. `get_day(p_day date) returns jsonb` for `auth.uid()`: entries, the day's chat observations, the day's user chat messages (by `local_date`), and the wearable night.
  5. pgTAP `003_history.test.sql`: frequency counts, a new symptom, a change at exactly 1.0, an empty range, summary_text non-empty, and RLS (patient B calling with A's id gets an empty result).
  6. Regenerate types.
- **Verification:** `supabase db reset && supabase test db`
- **Exit:** RPCs + tests merged.
- **Rollback:** revert the PR.

---

## Step 3 — Chat edge function: companion, extraction, guardrails (US-03, US-04, US-14)

- **Branch:** `feat/fn-chat` · **Model:** strongest · **Depends on:** 1b · **Parallel with:** 2, 5b
- **Context brief:** The patient writes to "Digna". Each turn must:
  - (a) reply empathetically in a peri/menopause context;
  - (b) **never diagnose, recommend medication, change dosing, advise starting or stopping therapy, or attribute a symptom to a specific cause** (US-14; allowed: summarise, ask, organise, point to topics for the doctor);
  - (c) optionally ask one clarifying question;
  - (d) extract structured observations linked to the source message (US-04).

  The canvas Chat confirms "I've added this to today: Hot flushes · 2 this morning". Severity scale per §0. Patient RLS forbids client writes to assistant messages and observations, so this function writes them with the service role.
- **Tasks:**
  1. **Before writing code, load the `claude-api` skill.** Confirm the Deno import (`npm:@anthropic-ai/sdk`), current model ids, and forced tool-use syntax. Use the current Sonnet-class model. Read the key from `Deno.env.get('ANTHROPIC_API_KEY')` and return a 500 with a generic message if it is missing.
  2. `supabase/functions/chat/` with `deno.json`, `index.ts` (thin handler), `handler.ts` (DI: supabase clients + Claude client injected), `extract.ts`, `guardrails.ts`.
  3. Request `POST { message: string 1..2000, input_mode: 'text'|'voice', local_date: 'YYYY-MM-DD' }` with a JWT required, validated with zod (`npm:zod`). Flow:
     - resolve the user with the user-scoped client
     - **rate limits:** ≤20 user messages per 10 min and ≤100 per day, else 429
     - insert the user message (user client)
     - load the profile, monitoring plan, the `local_date` check-in, and the last 20 messages
     - one Claude call with the guardrail system prompt and a forced tool `record_turn { reply, clarifying_question?, observations: [{ symptom_code?, custom_label?, severity?(1-5), duration_days?, observed_on? }] }`
     - map unknown codes to `custom_label`; `observed_on` defaults to `local_date`
     - insert the assistant message + observations with the service role (`source='chat'`, `source_message_id` = the user message)
     - return `{ reply, observations, message_id }`
  4. Guardrails: the system prompt lists the US-14 allow/deny rules. A post-check uses a pattern list (EN + PL: dosing units, "you should take/stop", drug names list, "you have <condition>", "caused by"). On a trip, replace the reply with a safe fallback ("That's a good question for your doctor — I've noted it for your next visit.") and insert a `guardrail_events` row (`patient_id`, `rule`, `created_at`, **no message text**) via a small migration with service-role-only RLS. Regenerate types.
  5. Deno tests (`deno test --allow-all supabase/functions/chat`): request validation, the extraction mapper, guardrail positive/negative cases in EN + PL, rate-limit branches, and the handler happy path with a **fake Claude client** and fake DB. No network.
  6. **Gated:** the user runs `supabase secrets set ANTHROPIC_API_KEY=…` themselves; deploy (`supabase functions deploy chat`) only with confirmation, or defer to Step 12.
- **Verification:** `deno test --allow-all supabase/functions/chat`. Locally, `supabase functions serve chat --env-file <user-provided>` plus a curl with a local user JWT.
- **Exit:** tests green. A manual "should I double my HRT dose?" returns the fallback.
- **Rollback:** revert the PR. Undeploy (gated).

---

## Step 4 — Context-check engine & doctor API (US-01, US-07..US-13)

- **Branch:** `feat/fn-context-check` · **Model:** strongest · **Depends on:** 2, 3 · **Parallel with:** 6
- **Context brief:** The external admin panel lets a clinician add the visit interview and see "3–5 rzeczy do doprecyzowania" (things to clarify). Simple CRUD goes through PostgREST with the RLS from 1b: monitoring plan (US-01), interview insert (US-07), feedback (US-13). The analysis lives in this edge function. Copy rules from `docs/user-stories.md`: the categories are *pominięty temat / potencjalna rozbieżność / nowy symptom / istotna zmiana*, the wording is always "do doprecyzowania" and never "błąd", and the system never diagnoses. Severity, change and the local-day rules are in §0. Reuse the Claude-client and DI patterns from `supabase/functions/chat/`.
- **Tasks:**
  1. `supabase/functions/context-check/` (`deno.json`, `index.ts`, `handler.ts`, `extract-interview.ts`, `rules.ts`). Request `POST { interview_id }` with a JWT. Load the interview with the **user** client: RLS returns nothing unless the caller is on the care team, in which case respond 404.
  2. Interview extraction: **if `interviews.extracted` is already set, use it and skip Claude.** Otherwise call Claude with a forced tool `mentions: [{ symptom_code?, custom_label?, stance: 'present'|'absent'|'improved'|'worse'|'unclear', quote }]`, then cache it in `extracted` (service role).
  3. `rules.ts`, pure with no I/O. Input: history from `get_patient_history` (30 days before `visit_at`), the previous interview's `visit_at` (or null), and the mentions. Output: insights. Named constants:
     - `MISSING_TOPIC_MIN_OCCURRENCES = 5` (days with severity ≥2 in 30 d) and not mentioned → `missing_topic` (US-08), title "Temat nieporuszony".
     - `DISCREPANCY_MIN_SHARE = 0.5` of the last 14 check-ins with severity ≥4 while the stance is `absent`/`improved` → `discrepancy` (US-09), title "Możliwa rozbieżność", summary like "8/14 ostatnich check-inów wskazywało problemy ze snem."
     - First occurrence after the previous interview, **or, with no previous interview, absent in the prior equal-length window** → `new_symptom` (US-10) with the first date and frequency.
     - |Δ| ≥ 1.0 per §0 → `significant_change`, worded by direction on the 1=none scale: "Nasilenie spadku energii wzrosło z 2.1 do 3.4".
     - Rank by (kind weight: discrepancy > missing_topic > new_symptom > significant_change, then frequency, then recency) and **cap at 5** (US-11).
     - Every insight has `evidence {entry_count, date_from, date_to, sources: ('checkin'|'chat')[], excerpts: [≤3 {date, source, text}]}` (US-12).
  4. Persist `context_checks` + `insights` (service role) and return them.
  5. RPC `get_context_check(p_id uuid) returns jsonb` (care team via RLS): insights + feedback + the `get_period_summary` output for the window (US-06 for the doctor).
  6. `docs/api.md`: one table covering **US-01..US-14**. Each row: story, actor (patient app / admin panel / system), mechanism (PostgREST table, RPC, or function), and a request/response example.
  7. Deno tests: `rules.ts` covers each kind, the no-previous-interview fallback, the cap of 5, ranking, evidence shape, and wording, using the docx examples as fixtures. The handler test covers the cached `extracted` path (no Claude call), and a non-care-team caller gets 404 (fake user client returns null).
  8. **Gated** deploy, or defer to Step 12.
- **Verification:** `deno test --allow-all supabase/functions/context-check && supabase test db`
- **Exit:** tests green. `docs/api.md` covers all 14 stories.
- **Rollback:** revert the PR.

---

## Step 5a — Mobile design tokens & UI primitives

- **Branch:** `feat/mobile-ui-kit` · **Model:** default · **Depends on:** 0 · **Parallel with:** 1a, 10
- **Context brief:** `apps/mobile` is the Expo SDK 57 template. **Read `apps/mobile/AGENTS.md` first** and use the v57 docs. This step adds only the visual foundation; no data or auth. The tokens are in §0, and the visual reference is `docs/design/*.dc.html` (inline styles carry the exact sizes).
- **Tasks:**
  1. Test harness first: `npx expo install jest-expo jest @types/jest @testing-library/react-native -- -D`. Add `"test": "jest"` and the `jest-expo` preset, with `transformIgnorePatterns` that cover pnpm's `node_modules/.pnpm/` layout. **Confirm `pnpm test` passes on one trivial test before adding more.**
  2. `npx expo install @expo-google-fonts/inter expo-font react-native-svg`. Load Inter in the root layout behind the splash screen.
  3. `src/theme/tokens.ts`: colours, radii, spacing, type scale (normal + large), severity/day-status palettes, severity labels.
  4. `src/components/ui/`:
     - `Screen` (safe area + bg)
     - `PrimaryButton` (pill, 68 h, disabled state "Choose an answer" style)
     - `OptionButton` (selected/unselected per OnbAge)
     - `StepProgress` (n of 5)
     - `Card`
     - `SeverityPicker` (5 rows: numbered dot + label, `accessibilityState.selected`)
     - `Chip`
     - `Icon` (inline SVG paths from the canvas, for in-screen icons only)

     Each has `accessibilityRole`/`accessibilityLabel`.
  5. Remove the template demo files (`hint-row`, `web-badge`, `animated-icon*`, `ui/collapsible`, `external-link` if unused, `scripts/reset-project.js`, its `package.json` script). **Do not touch `src/app/`** (5b owns routes).
  6. Tests: `SeverityPicker` selection and labels, `PrimaryButton` disabled state.
- **Verification:** §1 invariant 4.
- **Exit:** kit + tests merged. The app still boots.
- **Rollback:** revert the PR.

---

## Step 5b — Mobile auth, data layer, navigation shell

- **Branch:** `feat/mobile-shell` · **Model:** strongest · **Depends on:** 1b, 5a · **Parallel with:** 2, 3
- **Context brief:** Wire the app to Supabase and build the route skeleton. `src/lib/supabase.ts` already exists (expo-sqlite localStorage session). After 1a it is typed with `Database` from `src/lib/database.types.ts`. **Read `apps/mobile/AGENTS.md` and the v57 expo-router / NativeTabs docs.** Patients get an **anonymous session** on "Get started" and can attach an email later. Returning users sign in with an email OTP.
- **Tasks:**
  1. `npx expo install @tanstack/react-query zod`.
  2. `src/lib/supabase.ts`: throw a clear error if `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing. Don't touch `.env*`.
  3. Auth (`src/features/auth/`): an `AuthProvider` context with the session and profile.
     - **Get started:** `signInAnonymously()`.
     - **Sign in:** `signInWithOtp({ email, options: { shouldCreateUser: false } })`, then `verifyOtp({ email, token, type: 'email' })`.
     - **Link email** (for anonymous users, used by 9b): `updateUser({ email })`, then `verifyOtp({ email, token, type: 'email_change' })`. Handle "email already registered" with a friendly message suggesting sign-in.
     - Expose `signOut`.
  4. Data layer: `src/lib/api/{profile,plan,checkins,chat,wearables}.ts`, typed repository functions over tables / edge functions. Validate edge-function responses with zod. `src/lib/errors.ts` maps Postgrest/Functions/Auth errors to user-friendly text. Query hooks go in `src/features/<domain>/hooks.ts`. *(Calendar/history/day repositories belong to Steps 7/9a/9b.)*
  5. Routes:
     - `src/app/_layout.tsx`: providers (QueryClient, Auth) and a gate driven by the pure `resolveEntryRoute(session, profile)`:
       - no session → `(auth)/welcome`
       - `onboarding_completed_at` null → `(onboarding)/age`
       - otherwise → `(tabs)`
     - `(tabs)/_layout.tsx`: NativeTabs **Home / Calendar / Profile**. Icons use NativeTabs' supported sources (`sf` on iOS, `drawable`/`src` image elsewhere) per the v57 docs, **not SVG components**.
     - Placeholder screens: `(onboarding)/age…result`, `(tabs)/index|calendar|profile`, `chat`, `day/[date]`.
     - `(auth)/welcome` built per `docs/design/Main.dc.html`, and `(auth)/sign-in` (email → code).
     - Delete `explore.tsx` and the template `app-tabs*`.
  6. Tests: `resolveEntryRoute` (all branches), the error mapping, and the auth link-email flow with a mocked supabase client.
- **Verification:** §1 invariant 4. `pnpm start` on the iOS simulator: a fresh install shows Welcome, "Get started" lands on the onboarding placeholder, and a relaunch keeps the session.
- **Exit:** shell + auth merged.
- **Rollback:** revert the PR.

---

## Step 6 — Onboarding flow (artboards 1–7)

- **Branch:** `feat/mobile-onboarding` · **Model:** default · **Depends on:** 5b, 3 · **Parallel with:** 4
- **Context brief:** Build `docs/design/{OnbAge,OnbPeriod,OnbHRT,OnbSymptoms,OnbWatch,OnbResult}.dc.html` 1:1 with the `src/components/ui` kit. The answers go to `profiles`, and the monitoring plan is seeded. "Continue" stays disabled until an option is chosen. Free text from the Symptoms step goes through the `chat` edge function (`supabase.functions.invoke('chat', { body: { message, input_mode: 'text', local_date } })`), so extraction happens server-side.
- **Tasks:**
  1. `(onboarding)/_layout.tsx` holds the onboarding state (`useReducer` + context). Each screen shows "Step n of 5", back, and progress.
  2. `src/features/onboarding/stage.ts`: `inferStage(ageBand, lastPeriod)`:
     - `lt_3m` | `3_12m` → perimenopause
     - `gt_12m` → postmenopause if 55+, else menopause
     - `unsure` → unknown (UI shows perimenopause-style copy with an "unsure" note)

     Co-located test covering every combination.
  3. Symptoms: multi-select maps to catalog codes. The plan = defaults (canvas order) ∪ selected. "Write" holds the textarea. "Speak" shows the text input with a "Voice coming soon" note (real voice is Step 11).
  4. Watch: write a `wearable_connections` row for the chosen provider (no sync yet). Skip works.
  5. Result, on enter: upsert the profile (answers, `menopause_stage`, `timezone` from `Intl.DateTimeFormat().resolvedOptions().timeZone`), upsert `monitoring_plans`, send the free text (if any) to chat, then show the stage and the verbatim disclaimer. "Start my first check-in" sets `onboarding_completed_at` and replaces to `(tabs)`. All writes are idempotent (retry-safe), with errors via `src/lib/errors.ts`.
  6. Component test: Continue disabled → enabled.
- **Verification:** §1 invariant 4. Manual: Welcome → … → Home, then check the rows in local Studio.
- **Exit:** onboarding persists. A relaunch goes to Home.
- **Rollback:** revert the PR.

---

## Step 7 — Today check-in + Day detail (US-02)

- **Branch:** `feat/mobile-today` · **Model:** default · **Depends on:** 6, 2 · **Parallel with:** 8, 9a, 9b
- **Context brief:** Build `docs/design/Today.dc.html` + `DayDetail.dc.html`. Today walks through the monitoring-plan symptoms one at a time with `SeverityPicker` (1 None … 5 Severe), shows "n of N done" + a progress bar and an optional note, and saves with the patient's local date. Day status: max ≤2 good, 3 okay, ≥4 hard. The latest canvas has **no medication toggle and no "Add another symptom" opener**; extra symptoms arrive via Chat. Day detail uses the RPC `get_day(p_day)`.
- **Tasks:**
  1. `src/lib/api/day.ts` (`getDay`) + hooks. Today's date = device local date (`src/lib/dates.ts`, tested).
  2. `(tabs)/index.tsx`:
     - gradient hero with greeting + date
     - check-in card: pick a severity → upsert `checkins` + `checkin_entries` (optimistic), then advance via `nextUnanswered`
     - completed symptoms show as chips and can be tapped to edit
     - the note autosaves (`NOTE_DEBOUNCE_MS = 500`)
     - the watch row appears only when last night's `wearable_nights` exists, with severity hints only then
     - the "Anything else?" card → `chat`
  3. `day/[date].tsx`:
     - status pill
     - "What you logged" (entries + chat observations)
     - "From your watch"
     - "In your words" (user messages with time)
     - "Change this day" opens the Today editor for that date via `?date=`; past dates are editable, future dates are rejected
  4. Pure helpers + tests: `dayStatus`, `nextUnanswered`, `severityLabel`, local-date formatting.
- **Verification:** §1 invariant 4. Manual: a check-in survives a restart, and the Day detail matches.
- **Exit:** US-02 met (plan symptoms, 1–5, optional note, few steps, saved with date; extra symptoms via Chat, documented in `docs/api.md`).
- **Rollback:** revert the PR.

---

## Step 8 — Chat screen (US-03 UI)

- **Branch:** `feat/mobile-chat` · **Model:** default · **Depends on:** 6, 3 · **Parallel with:** 7, 9a, 9b
- **Context brief:** Build `docs/design/Chat.dc.html`. The backend is the `chat` edge function: `POST { message, input_mode, local_date }` → `{ reply, observations, message_id }`, or 429 on a rate limit. Text is the MVP. The tap-to-talk button is visible but shows a "Voice coming soon" hint until Step 11. Don't fake transcription.
- **Tasks:**
  1. `chat.tsx`:
     - history from `chat_messages` (paged, newest at the bottom)
     - input bar
     - send → `invoke('chat')`
     - optimistic user bubble
     - typing indicator
     - error bubble with retry
     - 429 → "Let's pause for a moment and continue later."
  2. Assistant bubbles with observations show "I've added this to today:" chips (severity colours) and a "Change this" link → `day/[local_date]`. After a turn, invalidate the Today/Day queries.
  3. Persistent disclaimer: "Digna doesn't give medical advice. Talk to your doctor about treatment."
  4. Tests: response zod parsing, error mapping, chip rendering.
- **Verification:** §1 invariant 4. Against local `functions serve`, "I had two hot flushes this morning and I'm very tired" → a reply + 2 chips.
- **Exit:** chat works end-to-end and history persists.
- **Rollback:** revert the PR.

---

## Step 9a — Calendar

- **Branch:** `feat/mobile-calendar` · **Model:** default · **Depends on:** 6, 2 · **Parallel with:** 7, 8, 9b
- **Context brief:** Build `docs/design/Calendar.dc.html`, **log mode only**. Data comes from `get_calendar_month(p_month)` → rows of `(day, status, has_bleeding, has_checkin)`. Status colours: good `#CDEDED`, okay `#FFD48A`, hard `#F46A8C`.
- **Tasks:**
  1. `src/lib/api/calendar.ts` + hook.
  2. `(tabs)/calendar.tsx`:
     - "<Month> so far" tiles (hard/okay/good counts)
     - month grid, Monday first, with prev/next
     - day colours, bleeding dot, today outlined
     - past days link to `day/[date]`, future days are inert
     - legend
     - accessibility label per cell ("15 October, hard day, bleeding")
  3. Pure `buildMonthGrid(year, month)` (leading blanks, Monday first) + tests, including February in a leap year.
- **Verification:** §1 invariant 4.
- **Exit:** Calendar matches the canvas with real data.
- **Rollback:** revert the PR.

---

## Step 9b — Profile

- **Branch:** `feat/mobile-profile` · **Model:** default · **Depends on:** 6, 2 · **Parallel with:** 7, 8, 9a
- **Context brief:** Build `docs/design/Profile.dc.html`. **Core:** the header card, watch connections, "My doctor" link code (`create_link_code()` RPC), and sign out. (No "Save my account": every user registers with email + password.) **Stretch items** are listed separately and skipped if time is short.
- **Tasks (core):**
  1. Header card: name, age band, stage, HRT.
  2. Watch section: connect/disconnect writes `wearable_connections`, plus a status line.
  3. "My doctor": generate a code and show it with an expiry countdown ("Share this code with your doctor. It expires in 23 h.").
  4. Sign out: confirm, then `signOut`, then Welcome.
  5. Tests: expiry formatting.
- **Tasks (stretch, separate commits):**
  - Daily reminder via `npx expo install expo-notifications` (check the v57 docs for Expo Go support of local notifications; if unsupported, mark it as dev-build only).
  - Text size (normal/large) through the theme scale.
  - "Download my data": `get_patient_history` over all time → JSON via `npx expo install expo-sharing`.
  - Static Privacy/Help screens.
  - Language row static "English".
- **Verification:** §1 invariant 4.
- **Exit:** the core items work.
- **Rollback:** revert the PR.

---

## Step 10 — Web landing page

- **Branch:** `feat/web-landing` · **Model:** default · **Depends on:** 0 · **Parallel with:** anything
- **Context brief:** `apps/web` is the Next.js 16 starter (App Router, Tailwind v4, **npm**). It is a static marketing page with no auth and no data writes. The brand tokens are in §0. The copy comes from `docs/design/Main.dc.html` ("Feel understood through menopause", "Tell me how you feel each day. Before every visit, your doctor gets a clear report.") and `OnbResult.dc.html` (the 3-step "What happens next").
- **Tasks:**
  1. Replace the starter `page.tsx`, starter SVGs and `globals.css`. Sections:
     - hero (gradient, headline, sub-copy, "Coming soon" store badges as text, no fake links)
     - how it works (3 steps)
     - for your doctor (pre-visit summary; "not a diagnosis")
     - privacy promise
     - footer

     Inter via `next/font/google`. Tokens as CSS variables.
  2. Metadata (title, description, OG). Responsive from 360 px. Landmarks, contrast ≥4.5:1, visible focus.
  3. Delete `src/lib/supabase.ts` from web only if `grep -r "lib/supabase" apps/web/src` finds no importers.
- **Verification:** §1 invariant 5. Use the `browser-automation` skill on `npm run dev` for 360 px and 1280 px screenshots and no console errors.
- **Exit:** the landing builds and renders.
- **Rollback:** revert the PR.

---

## Step 11 — [STRETCH] Native capabilities: voice + wearable sync

- **Branch:** `feat/mobile-native` · **Model:** default · **Depends on:** 7, 8, 9b · **Parallel with:** 12
- **Context brief:** These need native modules, so Expo Go is no longer enough. Use a dev build (`npx expo run:ios`; EAS builds are gated). Skipping this step does not block the DoD: Step 12 seeds the wearable data. Severity and local-date rules are in §0.
- **Tasks:**
  1. Voice: check the v57 docs and available skills for the recommended speech-to-text module. Tap-to-talk with the pulsing listening state (canvas), transcript into the input, sent with `input_mode: 'voice'`. Permission strings via `app.json` config plugins. Also enable "Speak" in onboarding.
  2. Wearables: a `WearableProvider` interface. HealthKit (iOS) and Health Connect (Android) readers sync last night (sleep minutes, awakenings, resting HR, wrist temperature delta if available) into `wearable_nights` on foreground. Garmin/Fitbit show "Coming soon".
  3. Tests: pure mappers (raw samples → row).
- **Verification:** dev build: a manual voice turn and a HealthKit simulator sample sync.
- **Exit:** voice works on one platform, and one provider syncs.
- **Rollback:** revert the PR (the app falls back to text + seeded data).

---

## Step 12 — Demo seed, DoD verification, hosted rollout

- **Branch:** `feat/demo-e2e` · **Model:** default; strongest for the final review · **Depends on:** 4, 7, 8, 9a, 9b · **Parallel with:** 11
- **Context brief:** The user stories' Definition of Done must run as one scenario. The patient checks in and chats, about 30 days of history exist, the clinician adds an interview, and the context check returns **≥1 missing topic, ≥1 discrepancy, ≥1 change**, each with source evidence. The doctor screen itself lives in the external admin panel, so **this repo's DoD artifact is the `get_context_check` JSON** captured in `docs/demo.md`. Context-check skips Claude when `interviews.extracted` is pre-filled, so **no mock flag exists in deployed code**.
- **Tasks:**
  1. `supabase/seed.sql` (local `db reset` only):
     - users: patient "Anna" and clinician "Dr Demo", each with `auth.users` **and matching `auth.identities`** rows (email provider, bcrypt `encrypted_password`) so password sign-in works; profiles (clinician role set by the seed)
     - a care link
     - 30 days of check-ins relative to `current_date`:
       - headache severity ≥2 on 7 days, absent from the interview (missing topic)
       - sleep severity ≥4 on 8 of the last 14 days, while the interview says sleep is fine (discrepancy)
       - energy mean rising ≥1.0 between halves (change)
     - chat messages + linked observations
     - 30 wearable nights
     - one interview with **pre-filled `extracted`** mentions
  2. `supabase/functions/tests/dod.test.ts` (Deno, against `supabase start` + `supabase functions serve`, sign in with the seeded users' passwords):
     - as clinician: invoke `context-check`; assert the 3 kinds, evidence fields, and ≤5 insights; `get_context_check` returns summary_text
     - as patient: insights and interviews are not readable
  3. `docs/demo.md`:
     - the local run book (`supabase start`, `db reset`, `functions serve`, `pnpm start`)
     - the mobile smoke path: Welcome → onboarding → check-in → chat → calendar → day
     - Anna/Dr Demo demo passwords
     - the captured `get_context_check` JSON
  4. **Gated hosted rollout**, each step confirmed by the user:
     - `supabase link`
     - `supabase db push`
     - user sets `ANTHROPIC_API_KEY`
     - `supabase functions deploy chat context-check`
     - hosted auth: email provider on, "Confirm email" off, minimum password length 8, anonymous sign-ins off
     - `mcp__supabase__get_advisors` (security, performance), then fix the findings in follow-up commits

     The hosted exit is a **smoke test** (register from the app, check in, one chat turn). The demo seed is not pushed to hosted unless the user asks.
  5. `README.md`: architecture paragraph, run/test commands, links to `docs/api.md` and `docs/demo.md`.
  6. Final strongest-model `code-reviewer` + `security-reviewer` over `git diff <step-0-merge>..main`.
- **Verification:** `supabase db reset && supabase test db && deno test --allow-all supabase/functions/`. All §1 invariants.
- **Exit:** DoD demonstrated locally with the JSON in `docs/demo.md`. Hosted smoke passes.
- **Rollback:** revert the PR. Hosted: down-migration + `functions delete` (gated).

---

## Open questions (defaults chosen; execution not blocked)

| # | Question | Default |
|---|---|---|
| 1 | Latest canvas removed Today's "Add another symptom" opener and medication toggle. Intentional? | Yes. Extra symptoms come via Chat (`custom_label`). No medication tracking. |
| 2 | Calendar "My watch" mode removed. | Log mode only. Watch data appears in Day detail and the Today row. |
| 3 | Account before onboarding? | Email + password registration on "Get started" (no anonymous sessions, no OTP codes; changed 2026-10-03). |
| 4 | Language. | English app UI. Guardrails cover EN + PL. Doctor-facing insight titles use the Polish category wording from the stories. |
| 5 | Clinician accounts. | An operator sets `profiles.role='clinician'` via SQL or the service role; no self-service. |
| 6 | Voice / real wearables. | Stretch (Step 11). The DoD uses seeded wearable data. |

## Plan mutation protocol

- **Split:** a step over ~600 changed lines, or a subagent truncated twice → split into `Nx`/`Ny` with their own branches. Update §2 and the Changelog.
- **Insert / skip / reorder:** edit this file in a `docs/plan-update-*` PR. Update §2 (graph and waves).
- **Abandon:** mark it `ABANDONED — reason`, and list follow-ups for the steps that depended on it.

## Changelog

- 2026-10-03: Initial blueprint (12+1 steps).
- 2026-10-03: Applied the adversarial review:
  - **Dependencies:** added the missing 7/9 → 2 and 6 → 3 dependencies, and moved the calendar/history repositories out of 5b.
  - **Mock flag:** removed the prod mock flag in favour of the cached `interviews.extracted`.
  - **Tooling:** Deno is now a gated Step 0 prereq with a `deno.json` per function. RLS-enabled is enforced via pgTAP. The Step 4 403 test moved to Deno.
  - **Security:**
    - role escalation guards (trigger never reads metadata; redeem requires a non-anonymous clinician; helpers take no identity param)
    - patients are read-only on observations and have no access to insights
    - per-user daily chat cap + lower anonymous rate limit
    - link-code lockout
  - **Splits:** 1 → 1a/1b, 5 → 5a/5b, 9 → 9a/9b.
  - **Auth flows:** fixed anonymous → email linking (`email_change` OTP, `shouldCreateUser:false`, `{{ .Token }}` template).
  - **Data rules:** added patient-local dates (`timezone`, `local_date`), a templated US-06 `summary_text`, and the US-10 no-previous-interview fallback. Unified the "change" definition and fixed the energy wording.
  - **DoD:** the DoD artifact is the `get_context_check` JSON; the hosted exit is a smoke test.
  - **Mobile setup:** NativeTabs icons via sf/drawable/src (no SVG components). jest-expo setup for pnpm. Worktree install + user-supplied env.
  - **Small fixes:** Artifact `out_dir`/explicit paths; e2e test moved under `supabase/functions/tests/` with `auth.identities` seeding; Profile extras marked stretch.
- 2026-10-03: **Auth simplified (user decision):** email + password register/sign-in replaces anonymous sessions and email OTP. No email confirmation (hosted "Confirm email" off), min password 8. Step 5b's OTP/link-email notes and Step 1b's anonymous-user notes are historical; 9b drops "Save my account".
