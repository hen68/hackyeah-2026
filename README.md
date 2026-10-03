# HackYeah 2026

Project repo for HackYeah 2026.

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
```

### Web

```sh
cd apps/web
npm install
npm run dev
```

### Supabase

```sh
cd supabase
supabase start   # requires Docker running
supabase status  # prints local API URL + anon key
```

A `supabase` MCP server is configured in `.mcp.json` (project-scoped) so Claude Code can manage the hosted Supabase project directly — run `/mcp` to authorize it.
