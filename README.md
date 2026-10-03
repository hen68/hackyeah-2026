# HackYeah 2026

**Digna**, a menopause symptom companion built for HackYeah 2026.

Patients check in daily, chat with Digna, and see their month at a glance in the Expo app. Symptoms mentioned in chat are logged to the day. A patient shares their data with a doctor through a one-time link code, and doctors use an external admin panel. Data lives in a hosted Supabase project (Postgres with row-level security on every table). The AI parts (`chat` and the doctor's `context-check`) run as Supabase edge functions.

See [docs/demo.md](docs/demo.md) for the demo run book and smoke path, and [plans/digna-mvp-end-to-end.md](plans/digna-mvp-end-to-end.md) for the plan.

## Structure

- `apps/mobile` — Expo app (TypeScript, Expo Router). Uses pnpm.
- `apps/web` — Next.js landing page (TypeScript, Tailwind, App Router). Uses npm.
- `supabase` — Supabase local dev config (`supabase init`). Backend for both apps.

## Getting started

### Mobile

```sh
cd apps/mobile
pnpm install
pnpm start
npx tsc --noEmit && npx expo lint && pnpm test   # checks
```

### Web

```sh
cd apps/web
npm install
npm run dev
```

### Supabase

Hosted project: `hackyeah2026` (org `hackyeah`, eu-west-1). Both apps read `*_SUPABASE_URL` / `*_SUPABASE_PUBLISHABLE_KEY` from their own `.env.local` (gitignored, not committed) — ask a teammate for the values or pull them via the `supabase` MCP server.

```sh
cd supabase
supabase start   # local Postgres stack, requires Docker running
supabase status  # prints local API URL + anon key
```

A `supabase` MCP server is configured in `.mcp.json` (project-scoped) so Claude Code can manage the hosted project directly (tables, migrations, branches) — run `/mcp` to authorize it.
