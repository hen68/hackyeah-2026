# Digna demo run book

Digna is a menopause symptom companion. Patients use the Expo app in `apps/mobile`; doctors use an external admin panel. Both read the hosted Supabase project (`eu-west-1`).

## Run it

```sh
cd apps/mobile
pnpm install
pnpm start                     # dev client on the phone
npx expo run:ios --device      # only after a native package changes (e.g. expo-notifications)
```

`apps/mobile/.env.local` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Ask a teammate for it.

Hosted auth must have the email provider on, **Confirm email off**, a minimum password length of 8, and anonymous sign-ins off.

## Checks

```sh
cd apps/mobile
npx tsc --noEmit && npx expo lint && pnpm test
```

Database checks run against the hosted project and roll back: `supabase/tests/smoke.sql` (via the Supabase MCP `execute_sql` or `psql -f`).

## Mobile smoke path

1. **Welcome → Get started:** register with an email and a password of 8+ characters.
2. **Onboarding:** age, last period, HRT, symptoms, optional watch, and free text. The result screen shows the likely stage (the same rule as the server's `infer_menopause_stage`).
3. **Today:** answer the check-in questions one at a time and add a note. "Anything else?" opens Chat.
4. **Chat:** send "I had two hot flushes this morning and I’m very tired". Digna replies and shows "I’ve added this to today:" chips, and "Change this" opens the day.
5. **Calendar:** the day shows as good / okay / hard. Tap it.
6. **Day detail:** what you logged, the watch night, and your note and chat messages.
7. **Profile:** watch toggle, "Get a code for my doctor" (8 characters, 24 h), daily reminder, Download my data, Privacy, Help, sign out.

## Not ready yet

- **Edge functions:** `chat` and `context-check` are not deployed yet (backend Steps 3–4). Until then, Chat shows "Digna can’t chat right now", and onboarding skips the free text.
- **Definition of done:** the DoD scenario (the clinician's context check returning at least one missing topic, one discrepancy and one change, with evidence) needs `context-check`. Paste its captured `get_context_check` JSON here once it runs:

```json
TODO: captured get_context_check output
```

- **Demo seed:** `supabase/seed.sql` (patient "Anna", clinician, 30 days of history) is for a local `supabase db reset` only and is not applied to the hosted project.
