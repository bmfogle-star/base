# Spark Backend — Architecture Sketch

This is the backend that turns Spark from a "bring-your-own-key" demo into a real
product people pay for. Its whole job: **hold the secret AI key, prove who the
user is, enforce their plan limits, and bill them.**

> Status: SKETCH / scaffold. Endpoints and data model are stubbed and runnable,
> but auth hardening, real Stripe wiring, and a production database are TODO.

---

## Why it exists

The app (frontend) runs in the user's browser, so it can't hold secrets. The
backend is the trusted middle layer:

```
  Spark app (browser)          Spark backend (this)            Providers
  ───────────────────          ────────────────────            ─────────
  - signup / login    ───────▶ verify identity, issue token
  - record a call     ───────▶ /ai/extract ──────────────────▶ Claude API
                               (uses OUR secret key,           (we pay cents)
                                checks plan + usage)
  - upgrade plan      ───────▶ /billing/checkout ────────────▶ Stripe
                               Stripe webhook ◀──────────────  (they pay us)
```

The user never sees an API key. They just sign up and pay $4.99 / $11.99.

---

## Data model (start simple)

**users**
| field | notes |
|---|---|
| id | uuid |
| email | unique |
| password_hash | bcrypt |
| plan | `premium` \| `platinum` |
| stripe_customer_id | set after first checkout |
| created_at | |

**usage** (one row per user per month — to enforce limits & control cost)
| field | notes |
|---|---|
| user_id | |
| month | e.g. `2026-06` |
| ai_calls | count of extractions this month |

Client data (the actual CRM records) can **stay on the device** for now — we only
need the backend for identity, the AI proxy, and billing. Cloud sync of client
data is a later phase.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | – | Create account, return JWT |
| POST | `/auth/login` | – | Log in, return JWT |
| GET  | `/auth/me` | JWT | Current user + plan + usage |
| POST | `/ai/extract` | JWT | **The key proxy.** Takes a transcript, calls Claude with our key, returns extracted details. Checks plan limit first. |
| POST | `/billing/checkout` | JWT | Create a Stripe Checkout session for a plan |
| POST | `/billing/webhook` | Stripe sig | Stripe tells us a payment succeeded → set the user's plan |
| GET  | `/health` | – | Health check |

---

## Plan limits (cost control)

Defined in `src/usage.js`. Example starting point:

| Plan | Clients (enforced in app) | AI extractions / month (enforced here) |
|---|---|---|
| Premium ($4.99) | 20 | 200 |
| Platinum ($11.99) | unlimited | 2000 |

Limits protect you: even if someone abuses the app, they can't run your Claude
bill past their tier. Tune the numbers once you see real usage.

---

## Auth flow (kept simple to start)

1. `register` / `login` → backend returns a **JWT** (signed token).
2. The app stores the token and sends it as `Authorization: Bearer <token>` on
   every request.
3. Middleware verifies the token and loads the user before protected routes run.

> Phase 2 hardening: refresh tokens, email verification, password reset, rate
> limiting on auth endpoints. Stubs noted in code.

---

## Billing flow

1. App calls `/billing/checkout` with the chosen plan.
2. Backend creates a Stripe Checkout session and returns its URL.
3. User pays on Stripe's hosted page.
4. Stripe calls our `/billing/webhook`; we mark the user `premium`/`platinum`.
5. `/auth/me` now reflects the paid plan and unlocks limits.

You'll need a Stripe account + two Products (Premium, Platinum) with monthly
prices, then put the price IDs in `.env`.

---

## Deployment

Same story as the bot server: this needs an always-on host (Fly.io, Railway,
Render, a VPS). It's lightweight, so the smallest instance is fine. Start with
SQLite (file-based, zero setup); move to Postgres when you have real traffic.

---

## Build phases

1. **Proxy + auth (MVP)** — register/login, JWT, `/ai/extract` with our key and
   per-plan limits. *This alone removes the need for users to get their own key.*
2. **Billing** — Stripe checkout + webhook, plan gating.
3. **Hardening** — email verification, password reset, rate limits, logging.
4. **Cloud sync (optional)** — store client records server-side for multi-device.

The scaffold in `/backend` covers phases 1–2 as stubs.
