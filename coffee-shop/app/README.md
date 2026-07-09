# Coffee Shop App — customer app + shop dashboard + server

This is the real, working product (v1):

- **Customer app** at `/` — menu, customization, cart, checkout, live order
  status, star rewards tied to the customer's phone number. Installable to the
  home screen (PWA).
- **Shop dashboard** at `/dashboard` — PIN-protected. Live orders with a chime,
  one-tap status (Start preparing → Ready → Picked up), menu editor (sold-out
  toggle + prices), reward settings, customer list with star balances.
- **Server** (`server.js`) — prices every order server-side, owns the rewards
  ledger, and takes payments through Stripe Checkout when a key is set.

## Run it locally

```
cd coffee-shop/app
npm install
npm start          # http://localhost:3000  (dashboard: /dashboard, PIN 1234)
```

No Stripe key = **demo mode**: orders are placed instantly with no charge and
the app shows a "DEMO MODE" ribbon. Perfect for pitching.

## Payment modes

| Env vars set | What happens |
|---|---|
| _none_ | Demo mode — no real charges, ribbon shown |
| `STRIPE_SECRET_KEY=sk_test_...` | Real Stripe Checkout flow with test cards (4242 4242 4242 4242) |
| `STRIPE_SECRET_KEY=sk_live_...` | Real money. Card/Apple Pay/Google Pay via Stripe's hosted payment page |

Also set `PUBLIC_URL=https://yourdomain.com` in Stripe mode (used for the
payment redirect back to the app) and `DASHBOARD_PIN` to something that isn't
1234.

## Deploy in ~15 minutes (Railway)

1. Create an account at railway.app (sign in with GitHub).
2. New Project → **Deploy from GitHub repo** → pick this repo.
3. In service **Settings → Root Directory**, enter `coffee-shop/app`.
4. In **Variables**, add `DASHBOARD_PIN` (pick a 4–6 digit PIN). Add
   `STRIPE_SECRET_KEY` + `PUBLIC_URL` when going live with payments.
5. **Settings → Networking → Generate Domain** — that URL is the shop's app.
   Put it in a QR code (any free QR generator) for the register.
6. **Important:** add a **Volume** mounted at `/app/coffee-shop/app/data` so
   orders/points survive restarts, or set `DATA_DIR` to the volume path.

Render.com works the same way (Web Service → root dir `coffee-shop/app` →
`npm start`), but avoid its free tier for a real shop — free services sleep
and miss orders.

## Going live with real payments (per shop)

1. Shop owner creates a Stripe account (stripe.com — takes ~10 min, needs
   their business info + bank account).
2. They add you as a team member, or hand you the **secret key**
   (Developers → API keys).
3. Set `STRIPE_SECRET_KEY` (live) + `PUBLIC_URL` on the deployment. Done —
   payouts land in the shop's bank on Stripe's normal daily schedule.

_Later, at multi-shop scale: switch to Stripe **Connect** (one platform
account, each shop onboards via a link, charges route to their connected
account automatically). The checkout code stays nearly identical._

## Square integration (beta)

Configured per shop in Dashboard → Rewards → Square integration:

1. Paste the shop's Square **access token** (sandbox token while testing;
   production token or OAuth later) → Connect.
2. Pick the location (auto-selected if the account has one).
3. Toggles:
   - **Send app orders to the Square register** — app orders are created in
     Square as paid pickup orders (note: Square charges 1% for API orders
     paid outside Square; roadmap is routing payment through Square itself
     for connected shops, which removes the fee).
   - **Auto-award stars for in-person Square sales** — when the barista
     attaches a customer (phone number) to a sale on their Square register,
     Square notifies `/square/webhook` and stars are credited automatically.
     Requires the webhook **signature key** (Square Developer Console →
     Webhooks → subscribe to `payment.created`/`payment.updated`, point at
     `https://<shop-domain>/square/webhook`).
4. **Sync menu from Square** pulls items/prices/categories into the app
   (first pass: names + prices; size/modifier mapping is roadmap).

Status: VERIFIED against Square's live sandbox (2026-07-09) — account
connect, location detection, and paid pickup-order push confirmed via the
dashboard's "Verify last push" readback. Webhook flow is signature-tested
locally; live webhook + menu sync still need a sandbox catalog item and a
webhook subscription to exercise. Remaining roadmap: per-item modifier
mapping, OAuth "Connect" button, and routing payment through Square for
connected shops (removes Square's 1% external-payment fee).

## Customizing for a real shop

- **Name, address, menu, reward tiers, deals, tax rate:** seeded in
  `server.js` (`SEED`). First boot writes `data/db.json`; after that the
  dashboard edits prices/availability/rewards live. For a new shop, edit SEED
  (or db.json) — 20 minutes with their menu in hand.
- **Branding:** colors are CSS variables at the top of
  `public/index.html`; logo is the SVG in the header + `public/icon.svg`;
  app name in `public/manifest.webmanifest`.

## Current limits (fine for shop #1, known and intentional)

- One shop per deployment (multi-tenant comes with Stripe Connect later).
- Single staff PIN, no per-employee accounts.
- No refund button yet — refund from the Stripe dashboard (one click there).
- No push notifications; customer app polls while open (works fine in
  practice for a 5–15 minute pickup window).
- JSON file storage — right for one shop's volume; move to Postgres at
  multi-shop scale.
