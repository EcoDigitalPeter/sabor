# levesabor-web

Next.js 14 (App Router) frontend for Ottimizo. See `/docs/plano/` at the repo root for the full product/implementation plan.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck`
- `npm run gen:types` — regenerate `src/types/api.d.ts` from `../levesabor-api/openapi.yaml`
- `npm run test:e2e` — Playwright, runs against a local `npm run dev` server with mocks enabled

## Deploying to Vercel

This repo is a monorepo — the Next.js app lives at `levesabor/levesabor-web`, not the repo root. When creating the Vercel project:

1. **Root Directory**: set to `levesabor/levesabor-web` in the Vercel project settings (Settings → General → Root Directory). Without this, Vercel won't find `package.json`/`next.config.mjs`.
2. **Environment variables** (Settings → Environment Variables), both required:
   - `NEXT_PUBLIC_API_URL` — the backend base URL. There is no deployed backend yet (Fase 1 backend hasn't started, see `docs/plano/tasks.md`), so this can point anywhere for now — it's only reached when mocks are off.
   - `NEXT_PUBLIC_USE_MOCKS` — set to `true` for any deployment made before the real backend exists. This starts an MSW worker in the browser (see `src/mocks/`) so every page (not just the public landing) is fully navigable against realistic fixture data. Set to `false` once a real backend is live behind `NEXT_PUBLIC_API_URL`.
3. Build command / output directory / install command: leave the Vercel defaults (Next.js is auto-detected).

No `vercel.json` is needed for this project — Next.js App Router + `next-pwa` both work with Vercel's default build detection.
