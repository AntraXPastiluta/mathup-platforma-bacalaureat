# Docker local testing

Minimal Docker setup for MathUP on **Docker Desktop (Windows)**.

## Prerequisites

- Docker Desktop running (Linux containers)
- Copy env template: `cp .env.docker.example .env.docker` and fill in Supabase keys  
  (or keep using `frontend/.env.local` — compose loads both)

## Quick start (frontend + cloud Supabase)

Recommended until local DB migrations include a baseline schema.

```powershell
docker compose up --build
```

Open http://localhost:5173

## Full local stack (Supabase + frontend)

Uses the Supabase CLI container to run `supabase start` (same as `npx supabase start` in `backend/`).

```powershell
docker compose --profile local up --build
```

Supabase Studio: http://127.0.0.1:54323  
API (from host): http://127.0.0.1:54321

Edge Function secrets: copy `backend/supabase/.env.example` → `backend/supabase/.env`.

Local DB applies migrations from `backend/supabase/migrations/` including the production baseline (`20260525000000_baseline_schema.sql`).

## Production-like preview

Build static assets and serve with nginx (requires Supabase vars at build time):

```powershell
docker compose --env-file .env.docker --profile preview up --build frontend-preview
```

Or copy `.env.docker.example` → `.env.docker` with your keys first.

Open http://localhost:8080

## Stop

```powershell
docker compose down
# also stop Supabase local containers:
docker compose --profile local-down run --rm supabase-stop
```

Helper scripts (PowerShell): `scripts/docker-dev.ps1`, `scripts/docker-stop.ps1`

## Windows notes

- Frontend talks to Supabase on the host via `host.docker.internal` (Docker Desktop default).
- Bind mounts use polling for Vite HMR (`DOCKER=1` in the dev container).
- First `--profile local` run pulls Supabase images (~2 GB); allow several minutes.
