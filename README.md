# Ricorrenza 2025

This is a React + Vite + Tailwind SPA deployed on Netlify with Supabase as the backend.

## Requirements
- Node 18+
- Supabase project (URL + anon key)

## Local setup
1. Copy `.env.example` to `.env` and fill your Supabase keys.
2. Install deps: `npm i`
3. Run dev server: `npm run dev`

## Build
`npm run build` -> output in `dist/`

## Deploy to Netlify (Git flow)
1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Netlify: New site from Git -> select repo.
3. Build command: `npm run build`  
   Publish directory: `dist`
4. In Site settings -> Build & deploy -> Environment -> Environment variables:
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `YOUR-ANON-KEY`
5. Trigger a deploy. Client-side routes are handled by SPA fallback via `public/_redirects` and `netlify.toml`.

## Deploy to Netlify (CLI)
1. Install CLI: `npm i -g netlify-cli`
2. Login: `netlify login`
3. Init (link folder to a site): `netlify init`
4. Set env vars:
   - `netlify env:set VITE_SUPABASE_URL "https://YOUR-PROJECT.supabase.co"`
   - `netlify env:set VITE_SUPABASE_ANON_KEY "YOUR-ANON-KEY"`
5. Deploy: `netlify deploy --build --prod`

## Routing & headers
- SPA fallback configured in `public/_redirects` and `netlify.toml`.
- Static assets are cached; HTML is not cached.

## Troubleshooting
- If you see `Missing Supabase environment variables`, set them in Netlify env and redeploy.
- 404 on refresh: ensure the SPA fallback is present (it is).
- Admin page overlap: public Navbar is hidden on `/admin` by route check in `src/App.tsx`.

## Health heartbeat (Netlify Scheduled Function + Auto-install)
- Scheduled heartbeat runs every 15 minutes via `heartbeat-schedule` (see `netlify.toml`).
- On-demand heartbeat via `/.netlify/functions/heartbeat` (with fallback `heartbeat_fallback`).
- The Admin panel (Connection Overview) shows a colored heartbeat status and has a “Run Heartbeat” button.

Auto-install the heartbeat table if missing:
- New function `/.netlify/functions/install-heartbeat` executes the migration SQL directly on Postgres.
- Security: requires you be signed in as OWNER (checked against `admin_users.role = 'owner'`).
- Admin UI shows “Auto-install (owner)” when the table is missing and calls the function with your session token.

Environment variables required in Netlify:
- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_DB_URL` (preferred) or `DATABASE_URL` pointing to your Supabase Postgres

Once variables are set, deploy, then in Admin → Connection Overview:
1) If Heartbeat shows missing table, click “Auto-install (owner)”.
2) Click “Run Heartbeat”; the badge should turn green (“just now”).
3) Verify in Netlify → Functions that `heartbeat-schedule` is Scheduled with a next run time.

## Documentation
- Schedule linking: `docs/schedule-linking.md`
- Admin Storage Overview and quota: `docs/storage-overview.md`
