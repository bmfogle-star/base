# HANDOFF SHEET — white-label coffee shop app business

**COMPANY NAME: Nova App Development** (founder renamed it 2026-07-17;
previously LocalBrew-Dev). Rebrand pass done 2026-07-17: partner brief,
intake sheet, CLAUDE.md, and the Square webhook subscription display name
("Nova rewards") all updated. Internal identifiers deliberately kept:
the "LB Reward: <tier>" Square discount names (the webhook matches on
that prefix — renaming would break live reward redemption) and the
`lb-sub-` idempotency key prefix. Logo: navy/gold circular badge with
gold nova starburst (IG pfp generated 2026-07-17 via Higgsfield).
Instagram bio written 2026-07-17 (see sales notes / chat).

**Email outreach kit (added 2026-07-17):** shops the founder DM'd asked to
be emailed, so `sales/EMAIL_TEMPLATES.md` now holds 4 templates (warm
follow-up with demo link + one-pager attached, single nudge, demo booking,
post-demo recap) plus deliverability rules — manual sends only, 10–15/day,
no automation (a Discord-sourced Python bulk-mailer was evaluated and
rejected 2026-07-17: spam risk, wrong stack, needless credential exposure).
`sales/ONE_PAGER.{md,html,pdf}` rewritten for Nova branding + current
facts (Square sync = no tablets, PWA = no app store, 1–2 week launch);
INTAKE_SHEET.pdf regenerated. Founder currently emails from Gmail; a
custom-domain address is recommended before heavy outreach.

**Louisville lead campaign (2026-07-19):** founder's market is Louisville,
KY. `sales/LEAD_TRACKER.csv` now holds a researched, ranked top-20 (250+
Google reviews preferred, no-own-app required; Quills and Heine Brothers
disqualified for having apps — useful as the "even the local chain has an
app" pitch line). `sales/OUTREACH_LOUISVILLE.md` holds 9 ready-to-send
personalized emails + 5 Instagram DM scripts on the founder-approved
template: personal opener, built-into-existing-register line (softened for
known Toast/Clover shops), demo link + dashboard reply-hook ("reply
'dashboard' for the code" — send PIN via onetimesecret only), NO pricing
in email, no "I'm local" claims (founder is not in Louisville). Outreach
account: novadevelopment313@gmail.com (fresh — pace 4-5 sends/day).
IG: @novawebappdev. Indiana metro leads held for a later wave. Next city
TBD from founder. Gmail is connected to Claude via connector (drafts
staging pending reconnect).

_Paste this into any AI assistant (or hand it to a developer) to continue the
work with full context. Last updated: 2026-07-11. Everything described here
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
- **Design system (REDESIGNED 2026-07-11, founder-approved):** Amex-style
  light premium theme, modeled on the American Express app at the founder's
  direction — white cards on cool light-gray (#EBEEF2), hairline dividers,
  one soft elevation, deep-navy hero card for the star balance, underline
  category tabs, full-round navy CTA pills, small uppercase field labels,
  restrained gold accents (logo keyline ring, section-heading rules, rewards
  keyline, cart count badge, dashboard top-bar edge). Dashboard matches:
  deep-navy top bar over light workspace, same tokens at the top of each
  HTML file. Brand unchanged: navy swallow logo (gradient #24486F->#152C46),
  primary --bird #2F5D8A / --bird-deep #16304A, gold ONLY for stars/rewards/
  gifts (darkened to ~#8A6420 wherever it's text on light). NO emojis
  anywhere except the shop logo. Headings are bold sans now (the .serif
  class is kept but renders bold sans). Menu photos are AI-generated
  (Higgsfield) for the OLD dark theme — check them against the white cards
  and regenerate lighter versions if they clash; served via server-side
  cached-media routes (`/img/menu/:id`, `/splash.mp4` — URLs hash-busted,
  cached on volume). Splash kept dark: full-frame ice-pour video + logo
  splash-in, skipped after payment redirects. The UI/UX Pro Max skill at
  `.claude/skills/` was used for the redesign — keep using it for UI work.
  LIQUID GLASS PASS 2026-07-14 (founder-requested, via UI/UX Pro Max):
  translucent blurred surfaces (backdrop-filter blur 14-26px + saturate
  160-180%) on: customer header, floating pill tab dock (inset, radius 28,
  active tab = white pill), sticky category chip-row, bottom sheet + blurred
  scrim, toasts, float-cart; ambient navy/gold radial auras behind content
  (.phone / dashboard body backgrounds) so glass has something to refract;
  cards at rgba(255,255,255,.86) WITHOUT blur (list perf); hero reward card
  got glass sheen (::before radial highlight); spring easing token
  --spring:cubic-bezier(.22,1.1,.3,1); @supports fallbacks to solid
  surfaces for no-backdrop-filter browsers; NO external fonts (CSP blocks
  them — system stack stays). Dashboard: glass navy top bar, glass login
  card, glass toasts. Contrast preserved (ink on >=86% white). All e2e
  green after the pass.

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
50-POINT SECURITY AUDIT PASSED 2026-07-14 (founder-requested): no secrets in
repo or git history, 0 npm vulnerabilities, XSS escaping verified across
both frontends, webhooks signature-checked, no cookies (CSRF/cookie flags
N/A), no SQL (injection N/A). Fixes shipped that day: staff PIN
brute-force lockout on EVERY staff endpoint (failure-only counter, shared
15-min lockout, timing-safe compare — previously only the login route was
limited); CSP + HSTS + Permissions-Policy headers; /api/orders/:num now
returns status-only to strangers (full receipt requires the customer
device token — order numbers are sequential/guessable); global JSON
404 + error handler (no stack traces to clients); legacy non-deployed
scaffolds (backend/ JWT default secret, server/ auth-off-when-unset) now
fail closed. Verified: 13-case attack-simulation test + webhook tests +
full e2e green. Founder-side items remain: DASHBOARD_PIN must not be 1234
on Railway, UptimeRobot on /healthz, 2FA everywhere, wipe demo data before
launch season.

## Square integration (KEY DIFFERENTIATOR — beta, partially verified)

- Connect via access token in dashboard panel; **VERIFIED against Square's
  live sandbox:** account connect, location detect, paid pickup-order push
  (confirmed via panel's "Verify last push" readback).
- In-person rewards via Square: ONE-TAP setup button (dashboard -> Rewards ->
  Square) creates the payment webhook subscription via Square's API and
  plants "LB Reward: <tier>" DISCOUNT objects in the shop's Square catalog.
  Earning: attached-customer sales auto-credit stars. Redemption: barista
  applies the LB Reward discount on the register; webhook detects it and
  deducts stars (insufficient balance -> flagged in audit log, never
  negative). All webhook logic tested locally (signature, idempotency,
  earn+redeem math, flags); needs PUBLIC_URL env set and one live click of
  the setup button to verify against real Square sandbox.
- LIVE ORDER-STATUS SYNC (added at founder request): webhook also subscribes
  to `order.updated` + `order.fulfillment.updated`; register taps on pushed
  app orders (in progress/ready/picked up) mirror onto the customer's phone
  via the existing 5s status poll. Mapping PROPOSED/RESERVED/PREPARED/
  COMPLETED -> status 0-3, forward-only (monotonic = idempotent + never rolls
  back our own dashboard taps; CANCELED ignored — refunds live in Square).
  Setup button PUT-upgrades existing subscriptions missing the new event
  types, so already-connected shops just re-tap it once. Tested locally
  (scratchpad sqstatus-test.js pattern: full 0->3 progression, stale/bad-sig/
  unknown-order/terminal cases, payment-webhook regression).
- Known: Square charges **1% on API orders paid externally** -> roadmap is
  routing app payments through Square for connected shops. Also roadmap:
  menu-sync modifier mapping, OAuth "Connect" button. A sandbox token is
  already connected on the live demo (owner has it; also in Square dev
  console under their app).

## Remaining work (priority order)

1. **Pre-launch hardening — BUILT 2026-07-11 (was: promised, not built).**
   Stripe finalization no longer depends on the customer's redirect: pending
   checkouts persist on the volume, `/stripe/webhook` handles
   `checkout.session.completed` (optional `STRIPE_WEBHOOK_SECRET` for
   signature checks), and a background reconciler re-checks unpaid sessions
   every minute — a paid order lands on the shop's board even if the
   customer closes the tab and no webhook is configured. All three paths
   re-fetch the session from Stripe and require `paid` + are idempotent, so
   the unsigned webhook is safe. Shop-hours gate: Dashboard → Rewards →
   Store hours (per-day open/close, time zone, OFF by default so the demo
   stays orderable 24/7); when on, the server rejects orders while closed
   and the app shows "Closed · opens …" with the pay button disabled.
   `/healthz` returns 200 only if the data volume is writable (503
   otherwise) — founder creates the free UptimeRobot monitor against it
   (now in LAUNCH_CHECKLIST). Tested: hours gate + healthz + webhook
   routing are in the e2e suite (demo mode). NOT yet exercised against real
   Stripe: live webhook delivery and a paid checkout round-trip — run one
   sk_test transaction when a Stripe key first goes in.
2. Live-verify Square webhook + menu sync (needs sandbox catalog item).
3. Per-shop onboarding: clone service per shop, SEED config from their
   menu/brand, their Stripe/Square keys. See `app/README.md` deploy guide.
4. Roadmap: Square payments for connected shops, printer support
   (Star/Epson), OAuth, Postgres at scale, push/SMS marketing (opt-in only —
   TCPA), App Store builds (Capacitor exists in repo root from old project).

## Installed AI tooling

The **UI/UX Pro Max** skill (v2.6.2, MIT, from the founder's fork
`bmfogle-star/ui-ux-pro-max-skill`) is installed at repo-root
`.claude/skills/` — design-system/style/palette/typography guidance that
Claude Code loads automatically. Update with `npm i -g ui-ux-pro-max-cli &&
uipro init --ai claude` from the repo root. Its search scripts need Python 3
(stdlib only, no network).

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
