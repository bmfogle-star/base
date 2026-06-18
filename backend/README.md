# Spark Backend (scaffold)

The trusted server that hides the AI key, authenticates users, enforces plan
limits, and bills via Stripe. See `../BACKEND.md` for the full architecture.

## Run locally

```bash
cd backend
cp .env.example .env     # fill in JWT_SECRET and ANTHROPIC_API_KEY at minimum
npm install
npm start                # boots on :8080
```

## What works in this scaffold

- ✅ `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (JWT auth)
- ✅ `POST /ai/extract` — the key proxy: calls Claude with the server's key and
  enforces the user's monthly limit (no user key needed)
- ✅ Per-plan monthly usage tracking (SQLite)
- 🚧 `POST /billing/checkout` + `/billing/webhook` — Stripe wired but needs your
  account, products, and price IDs in `.env`

## TODO before production

- Email verification, password reset, auth rate limiting
- Map Stripe price → plan robustly (not by amount)
- Move SQLite → Postgres when traffic grows
- Connect the frontend: replace the in-app Claude key with calls to `/ai/extract`

## Deploy

Lightweight always-on host (Fly.io / Railway / Render / VPS). Same approach as
`../server` (the meeting bot). Start with SQLite; no extra services needed.
