# Shop Onboarding Runbook — signature to launch (~1–2 weeks)

_Run this for every shop that signs. "YOU" = founder. "AI" = your build
assistant (paste HANDOFF.md into a session and point it at this runbook).
"SHOP" = the owner/staff._

## Day 0 — Signature day (YOU, ~20 min)

- [ ] Countersign the agreement; send the shop their copy. Collect the $100
  deposit if they chose that option (goes toward month 1).
- [ ] Book two calendar slots with the owner right now, before leaving:
  **Intake** (30–45 min, within 2 days) and **Launch/training day**
  (~2 hours, targeted 1–2 weeks out).
- [ ] Text/email them the prep list: menu with prices + size/milk/extras
  options, logo files (highest quality they have), brand colors, hours,
  local sales-tax rate, and who administers their Square (if on Square).

## Day 1–2 — Intake sit-down (YOU + SHOP, 30–45 min)

Collect into one folder/note:
- [ ] Menu: every item, price, sizes, milk options, extras. Photos of their
  actual drinks if they have decent ones (real photos beat AI).
- [ ] Logo + colors + the shop's name exactly as it should appear.
- [ ] Reward rules: stars per $1 (default 2), the 3 tiers and what they
  unlock, deals (double-star day? birthday drink?). Gift cards on/off.
- [ ] Hours per day + time zone (for the hours gate).
- [ ] Their local sales-tax rate.
- [ ] Staff PIN they want for the dashboard.
- [ ] **Start their Stripe account together** (stripe.com, ~10 min: business
  info + bank). Verification finishes over a day or two in the background.
- [ ] If on Square: identify the Square account owner login (needed for the
  token step later — we walk them through it on launch week; ~10 min).

Then hand the folder to AI: "New shop signing: here's everything — build
their instance per the runbook."

## Day 2–5 — AI builds their instance (AI, with YOU reviewing)

- [ ] New Railway service from the same repo/branch, **Root Directory
  `coffee-shop/app`**, its own volume at `/data`, own `DASHBOARD_PIN`,
  `DATA_DIR`, `PUBLIC_URL` (their domain once attached).
- [ ] SEED config replaced with their menu/tiers/deals/tax/hours; brand
  tokens + logo swapped in both HTML files + manifest + icons; their name
  everywhere Bluebird was.
- [ ] Menu photos: shop's real photos, or AI-generated matching set.
  Optional wow: custom splash video of their signature drink.
- [ ] Domain: `order.<theirshop>.com` (~$12) or subdomain of your company
  domain; attach in Railway, set `PUBLIC_URL` to it.
- [ ] QR code files: register sign + table tents (point at their domain).
- [ ] AI runs full e2e against the new instance. YOU click through it on
  your phone like a customer and like a barista. Fix nits now.

## Day 3–5 — Payments live (YOU + SHOP, ~30 min together)

- [ ] Stripe activated → owner (or you, screen-sharing) copies the LIVE
  secret key into that shop's Railway Variables: `STRIPE_SECRET_KEY`.
  Set `STRIPE_WEBHOOK_SECRET` if configuring the signed webhook (AI guides).
- [ ] **The proof test:** place a real ~$3 order with YOUR own card on their
  live app → watch it hit their dashboard → refund it from their Stripe.
  Money in, money back, whole loop proven. Show the owner this test.
- [ ] Set up YOUR billing of the shop: from your own Stripe, create a $312/mo
  recurring invoice/subscription for the shop, starting on launch date
  (contract says billing starts at launch — honor it to the day).

## Launch-week — Square connection (YOU + SHOP, ~20 min, Square shops only)

- [ ] With the owner logged into their Square: create the access token
  (AI provides click-by-click for their account; OAuth one-click is roadmap).
- [ ] Paste into Dashboard → Rewards → Square → Connect. Pick location.
- [ ] Enable "Send app orders to the Square register."
- [ ] Tap **"Enable in-person rewards (one tap)"** → webhook + LB Reward
  discounts created automatically.
- [ ] **Live test on their register:** ring a $1 sale, attach the owner's own
  phone number as the customer, complete it → stars appear (check In-store
  lookup). Then apply an "LB Reward" discount on a second test sale →
  stars deducted. Both logged in the audit trail.

## Launch day (YOU at the shop, ~2 hours)

- [ ] Counter device: dashboard open, logged in, sound on, plugged in,
  screen never sleeps.
- [ ] Staff training (30 min, keep it tiny):
  1. Order board: tap Preparing → Ready → Picked up.
  2. "Want your number in?" → add customer on Square (or In-store tab).
  3. Redemptions: LB Reward discount on Square / In-store tab elsewhere.
  4. Sold out? Menu tab, one tap.
  5. Refunds happen in Stripe/Square, not the app.
- [ ] Punch-card amnesty: staff convert old punch cards to stars via
  In-store tab (e.g., 1 punch = 5★). This is the adoption kickstart.
- [ ] Soft launch: staff + friends order for a day BEFORE signage goes out.
- [ ] Then: QR table tents out, register sign up, barista script live
  ("scan this — first reward's close").
- [ ] Create free UptimeRobot monitor on `https://<their-domain>/healthz`
  alerting YOUR phone.

## Weeks 1–4 (YOU, ~15 min/day then weekly)

- [ ] Week 1: check in daily. Answer the owner fast — responsiveness IS the
  $312 product. Fix nits via AI same-day.
- [ ] Weekly: pull numbers from the dashboard (orders, members, top
  customers) and TEXT THEM TO THE OWNER unprompted. "42 app orders, 61
  members this week" is retention gold.
- [ ] Week 4: vs target (~100 orders/mo by week 4–6). On track → ask for
  the testimonial + two referrals ("which owners do you know?"). Behind →
  adoption levers: staff script, double-star week, signage placement.

## Per-shop cost sanity check

Railway service ~$5/mo + domain ~$1/mo ≈ **$6/mo cost against $312/mo
revenue.** Your margin is service and attention — budget your time
accordingly.
