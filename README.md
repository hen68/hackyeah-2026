# HackYeah 2026

Project repo for HackYeah 2026.

## Structure

- `apps/mobile` — Expo app (TypeScript, Expo Router). Uses pnpm.
- `apps/web` — Next.js landing page (TypeScript, Tailwind, App Router). Uses npm.
- `supabase` — not set up yet. Supabase CLI install is blocked locally (Xcode Command Line Tools need updating to 27.0). See [Using Supabase with Expo](https://docs.expo.dev/guides/using-supabase/) for setup once unblocked.

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
