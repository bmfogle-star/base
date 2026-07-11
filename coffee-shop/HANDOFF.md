# HANDOFF SHEET — white-label coffee shop app business

_Paste this into any AI assistant (or hand it to a developer) to continue the
work with full context. Last updated: 2026-07-10. Everything described here
is committed and pushed._

## Who/what this is

Non-technical founder building a company that sells independent coffee shops
their own branded mobile ordering + rewards app (a "Starbucks app for the
little guys"). The product is BUILT and deployed as a working demo; pitching
to shop owners starts now. AI assistants do the engineering.

## Business decisions (settled — don't relitigate)

- **Model:** white-label, one branded app per shop. Web-app first (QR code,
  add-to-home-screen); App Store/Play Store later (Apple rule 4.2.6: each
  shop's iOS app publishes under the shop's own Apple dev account, $99/yr).
- **Pricing:** $0 setup ever, **$312/mo base**. Founding offer (first 5
  shops): rate locked 12 months, billing starts at launch, cancel anytime
  30-day notice, 0% of sales.
- **Payments:** shop's own Stripe; money goes customer -> shop's bank.
  Provider NEVER holds funds (money-transmitter risk) and never stores card
  numbers (Stripe hosted checkout = PCI stays with Stripe).
- **Sales motion:** remote-first (Zoom/Loom). Demo shop is fictional
  "Bluebird Coffee Co."
- **Rewards:** phone number = the account, everywhere (app + counter).
  Default 2 stars/$1; tiers 50/100/150. Names required on accounts.

## Live URLs & infrastructure

- **Demo customer app:** https://base-production-175d.up.railway.app
- **Staff dashboard:** same URL + `/dashboard` (PIN set by owner in Railway)
- **Hosting:** Railway project (owner's account), service `base`, deploys
  automatically from GitHub branch (below). Volume mounted at `/data` with
  env `DATA_DIR=/data`. Railway trial — needs a card added soon.
- **Env vars in use:** `DASHBOARD_PIN`, `DATA_DIR`. Supported: `PUBLIC_URL`,
  `STRIPE_SECRET_KEY` (sk_test/sk_live switches demo->real payments),
  `SQUARE_ACCESS_TOKEN`/`SQUARE_ENV`/`SQUARE_LOCATION_ID`/`SQUARE_WEBHOOK_KEY`
  (self-heal restore), `SPLASH_VIDEO_URL`.

## Code

- **Repo:** github.com/bmfogle-star/base — **branch
  `claude/coffee-shop-app-startup-ivqril`** (NEVER push elsewhere; `main`
  holds an unrelated older project "Spark" — do not touch it).
- **App lives in `coffee-shop/app/`:** Node/Express server (`server.js`),
  single-file vanilla-JS frontends (`public/index.html` customer,
  `public/dashboard.html` staff), Square connector (`lib/square.js`).
  Data = JSON file on the volume (fine at 1-shop scale; Postgres at ~5 shops).
  Prices/stars all computed server-side. Daily self-backups to
  `DATA_DIR/backups`. Boot counter on dashboard Rewards page detects
  storage-persistence failures (boot #1 after redeploy = volume broken).
- **Tests:** `coffee-shop/app/test/e2e.js` (Playwright; needs
  `npm i -D playwright-core` + Chromium path in `CHROMIUM`). Covers ordering,
  dashboard round-trip, rewards earn/redeem, gift cards cross-customer,
  sold-out, returning customers. RUN IT BEFORE EVERY COMMIT.
- **Design system:** dark premium theme, tokens at top of each HTML file.
  Brand: navy swallow logo (gradient #24486F->#152C46), dark blue accent
  (--bird #2F5D8A), cream text, gold ONLY for stars/rewards/gifts. NO emojis
  anywhere except the shop logo. Menu photos are AI-generated (Higgsfield),
  served via server-side cached-media routes (`/img/menu/:id`, `/splash.mp4`
  — URLs hash-busted, cached on volume). Splash: full-frame ice filling with
  vanilla latte + logo splash-in (~0.5s), skipped after payment redirects.

## Feature inventory (all live, all e2e-tested)

Customer app: menu w/ photos + customization, cart page (past orders on top,
inline checkout below), pickup times incl. custom time picker, star rewards
(earn/redeem), digital gift cards (buy/share/redeem/apply at checkout),
wallet (Stripe-held cards messaging + demo card), order status live-updates,
PWA installable. Dashboard: PIN login (rate-limited), live order board w/
chime -> Preparing/Ready/Picked-up, menu editor (86 + prices), rewards +
gift-card settings, **In-store tab** (earn/redeem by phone at counter, 3
credits/phone/day cap, owner audit log), customer list, Square panel.
Security: phone-lookup privacy (device tokens), rate limits, /privacy page,
security headers, server-side pricing.

## Square integration (KEY DIFFERENTIATOR — beta, partially verified)

- Connect via access token in dashboard panel; **VERIFIED against Square's
  live sandbox:** account connect, location detect, paid pickup-order push
  (confirmed via panel's "Verify last push" readback).
- Webhook auto-stars for counter sales (barista attaches customer phone on
  their Square register -> our `/square/webhook` credits stars): built +
  signature/idempotency tested locally; needs a live webhook subscription
  (Square dev console -> point at `https://<domain>/square/webhook`, paste
  signature key into dashboard panel) to verify end-to-end.
- Known: Square charges **1% on API orders paid externally** -> roadmap is
  routing app payments through Square for connected shops. Also roadmap:
  menu-sync modifier mapping, OAuth "Connect" button. A sandbox token is
  already connected on the live demo (owner has it; also in Square dev
  console under their app).

## Remaining work (priority order)

1. **Pre-launch hardening (promised, not built):** Stripe webhook backup for
   order finalization (redirect-only today — CRITICAL before real money);
   shop-hours gate (app takes orders 24/7 today); uptime monitoring.
2. Live-verify Square webhook + menu sync (needs sandbox catalog item).
3. Per-shop onboarding: clone service per shop, SEED config from their
   menu/brand, their Stripe/Square keys. See `app/README.md` deploy guide.
4. Roadmap: Square payments for connected shops, printer support
   (Star/Epson), OAuth, Postgres at scale, push/SMS marketing (opt-in only —
   TCPA), App Store builds (Capacitor exists in repo root from old project).

## Business docs (all in `coffee-shop/`)

`PLAN.md` (plan/competitors/gates) · `LAUNCH_CHECKLIST.md` (founder to-dos:
LLC, domain, Railway card, pitch plan) · `HANDOFF.md` (this file) ·
`BUSINESS_BRIEF.md` (voice-chat advisor brief) · `sales/` (ONE_PAGER, FAQ w/
one-liners, DEMO_SCRIPT for Zoom/Loom, FINDING_OWNERS playbook,
FOUNDING_CUSTOMER_AGREEMENT) · `legal/` (SERVICE_AGREEMENT.html+pdf — $312/mo,
liability cap 3-months-fees, downtime non-liability + fast-restore promise,
24h outage credit; LEGAL_NOTES.md — TCPA/tax/funds-flow rules).

## Founder's own pending to-dos (not code)

File LLC (~30 min, state SoS site) -> EIN -> business bank. Buy domain +
branded email. Add card to Railway. Record Loom (script in sales/). Build
30-shop target list (playbook in sales/). Lawyer pass on contract before
shop #1 signs (~$200-400).

## Working conventions for the next assistant

- Commit to the branch above with clear messages; push after each work unit.
- Run the e2e suite before committing app changes.
- The founder is non-technical: explain in plain language, do the work for
  them, verify everything yourself, be honest about what's tested vs not.
- Never store card numbers; never route shop money through the platform;
  keep the no-emoji rule; keep everything white-label (tokens/config, no
  hardcoded shop specifics beyond the Bluebird demo seed).
