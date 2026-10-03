# Digna demo run book

Digna is a menopause symptom companion. Patients use the Expo app in `apps/mobile`; doctors use an external admin panel. Both read the hosted Supabase project (`eu-west-1`).

## Run it

```sh
cd apps/mobile
pnpm install
pnpm start                     # dev client on the phone
npx expo run:ios --device      # only after a native package changes (e.g. expo-notifications)
```

After pulling a native package or config plugin change (e.g. `expo-speech-recognition`), run `npx expo prebuild --platform ios` before `expo run:ios`. `ios/` is generated and git-ignored, and an old one lacks new permission strings, so the app crashes on first mic use.

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

## Demo data and definition of done

`supabase/seed.sql` creates patient **Anna** (`anna@digna.test`) and clinician **Dr Demo** (`dr.demo@digna.test`), both with password `DignaDemo2026`. It also adds a care link, 30 days of check-ins, a chat turn, watch nights and today's interview (`6f1c2a4e-8b3d-4c7a-9e21-0d5b7a3c9f10`). A local `supabase db reset` applies it; on the hosted project it was run once by hand. Dates are relative to the run day, so to re-seed on a later day first delete both users from `auth.users` (this cascades).

The DoD scenario: Dr Demo calls `context-check` with `{"interview_id": "6f1c2a4e-8b3d-4c7a-9e21-0d5b7a3c9f10"}` (add `"refresh": true` to recompute). Anna gets a 404 for the same call and reads no insights, interviews or context checks. Example `get_context_check` output, captured on the hosted project (dates follow the seed's run day):

```json
{
  "insights": [
    {
      "id": "89e144c8-5f89-4596-84dc-508e84f542b3",
      "kind": "discrepancy",
      "rank": 1,
      "title": "Możliwa rozbieżność",
      "summary": "8/14 ostatnich check-inów wskazywało silne nasilenie objawu „Sleep trouble”, a w rozmowie pacjentka mówiła o poprawie. Do doprecyzowania.",
      "evidence": {
        "date_to": "2026-10-02",
        "sources": [
          "checkin"
        ],
        "excerpts": [
          {
            "date": "2026-10-01",
            "text": "Slept badly, awake from 3am.",
            "source": "checkin"
          },
          {
            "date": "2026-09-25",
            "text": "Slept badly, awake from 3am.",
            "source": "checkin"
          },
          {
            "date": "2026-09-20",
            "text": "Slept badly, awake from 3am.",
            "source": "checkin"
          }
        ],
        "date_from": "2026-09-20",
        "entry_count": 8
      },
      "feedback": null,
      "custom_label": null,
      "symptom_code": "sleep"
    },
    {
      "id": "00b1e39e-769c-451a-a640-cc4b78df9048",
      "kind": "missing_topic",
      "rank": 2,
      "title": "Temat nieporuszony",
      "summary": "Objaw „Headache” występował w 7 z ostatnich 30 dni, a nie pojawił się w rozmowie. Do doprecyzowania.",
      "evidence": {
        "date_to": "2026-09-30",
        "sources": [
          "checkin"
        ],
        "excerpts": [
          {
            "date": "2026-09-21",
            "text": "Headache by the afternoon.",
            "source": "checkin"
          },
          {
            "date": "2026-09-11",
            "text": "Headache by the afternoon.",
            "source": "checkin"
          }
        ],
        "date_from": "2026-09-06",
        "entry_count": 7
      },
      "feedback": null,
      "custom_label": null,
      "symptom_code": "headache"
    },
    {
      "id": "5600fdbb-b43b-4f0b-9ee1-b7ebaf5b7643",
      "kind": "significant_change",
      "rank": 3,
      "title": "Istotna zmiana",
      "summary": "Nasilenie objawu „Low energy” wzrosło z 1.5 do 3.1. Do doprecyzowania.",
      "evidence": {
        "date_to": "2026-10-02",
        "sources": [
          "checkin"
        ],
        "excerpts": [
          {
            "date": "2026-10-01",
            "text": "Slept badly, awake from 3am.",
            "source": "checkin"
          },
          {
            "date": "2026-09-25",
            "text": "Slept badly, awake from 3am.",
            "source": "checkin"
          },
          {
            "date": "2026-09-21",
            "text": "Headache by the afternoon.",
            "source": "checkin"
          }
        ],
        "date_from": "2026-09-03",
        "entry_count": 30
      },
      "feedback": null,
      "custom_label": null,
      "symptom_code": "energy"
    }
  ],
  "context_check": {
    "id": "a6a043eb-16df-44dc-b3ba-94809bf3201b",
    "created_at": "2026-10-03T21:59:59.763079+00:00",
    "patient_id": "00000000-0000-0000-0000-0000000000a1",
    "period_end": "2026-10-02",
    "interview_id": "6f1c2a4e-8b3d-4c7a-9e21-0d5b7a3c9f10",
    "period_start": "2026-09-03"
  }
}
```
