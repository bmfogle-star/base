# Launch Checklist — from zero to pitching (target: Tuesday)

_Work top to bottom. Times are realistic totals, not guesses._

## Step 1 — Tonight: get the app on the internet (~25 min, ~$5/mo)

- [ ] Go to **railway.app** → "Login" → **sign in with GitHub** (the account
  that owns this repo).
- [ ] **New Project → Deploy from GitHub repo** → choose `bmfogle-star/base`.
- [ ] In the service: **Settings → Source** — set **Branch** to
  `claude/coffee-shop-app-startup-ivqril` and **Root Directory** to
  `coffee-shop/app`.
- [ ] **Variables** tab → add:
  - `DASHBOARD_PIN` = a 4–6 digit PIN you choose (staff login)
  - `DATA_DIR` = `/data`
- [ ] **Settings → Volumes → Add volume**, mount path `/data`
  (this makes orders + star balances survive restarts).
- [ ] **Settings → Networking → Generate Domain** → you get a URL like
  `https://something.up.railway.app`.
- [ ] **Test it:** open the URL on your phone → place an order (demo mode, no
  charge). Open `URL/dashboard` on a laptop/tablet → enter your PIN → the
  order should be sitting there. Tap it through Preparing → Ready and watch
  your phone update.

## Step 2 — Tonight: make it pitch-ready (~30 min)

- [ ] Make a **QR code** of your URL (qr.io, Canva, or any free generator).
  Save it to your phone; print a few if you can.
- [ ] Fill in the [bracketed] blanks in `coffee-shop/sales/ONE_PAGER.md` and
  `FOUNDING_CUSTOMER_AGREEMENT.md` (your name, phone, email). Print ~10 of
  each, or keep them on your phone.
- [ ] **Rehearse once, out loud** (seriously): hand them your phone or the QR
  code → they order a latte → point at your tablet as it chimes → tap Ready →
  their phone updates. End with: "That, with your name and logo on it."

## Step 3 — This weekend: aim (~1 hour)

- [ ] List **10 target shops** — independent (no franchises), ideally busy
  mornings with lines, owner works the counter. Note when each is slow
  (usually 2–4 pm).
- [ ] Buy your **domain** (~$12/yr, Namecheap/Cloudflare) and set up
  **email on it** (Google Workspace, ~$7/mo) if you have a spare 30 minutes.
  Optional for Tuesday, but a branded email helps.
- [ ] Don't pitch on July 4th weekend rush — coffee shops are slammed. Scout,
  don't sell.

## Step 4 — Monday: paperwork in the background (~30 min)

- [ ] File your **LLC** on your state's Secretary of State website
  ($50–$300 one-time in most states). It processes while you sell — nothing
  waits on it.
- [ ] After approval arrives (days–weeks): free **EIN** at irs.gov (10 min),
  then a **business bank account** (Mercury/Relay online, or your local bank).

## Step 5 — Tuesday: pitch day

- [ ] Visit 3–5 shops from your list during their slow window. Buy a coffee.
  Ask for the owner or the best time to catch them.
- [ ] Run the live demo (90 seconds). Offer the founding deal: **$0 setup,
  $99/mo locked for 12 months, 0% of sales, billing starts at launch, cancel
  anytime.**
- [ ] Goal: **signed founding-customer sheets**, not perfection. A "come back
  Thursday when the owner's in" is a win too — get a name and time.
- [ ] Tell me how it went. 3+ signatures = I build their branded versions and
  the Stripe live-payment setup. Objections = we tune the pitch together.

## When a shop actually signs (that week — I do most of this)

- [ ] Sit with the owner (10 min) while they create their **Stripe account**
  (stripe.com — business info + bank account).
- [ ] Send me their menu, logo, colors, hours, reward preferences → I rebrand
  and configure their deployment.
- [ ] Set `STRIPE_SECRET_KEY` + `PUBLIC_URL` on their Railway service → real
  payments on. Test with one real $3 order, refund it from Stripe.
- [ ] Print their QR table tents, prop up the counter tablet on
  `/dashboard`, train staff (15 min), launch.
