# Brew Local — Business & Product Plan

_White-label mobile apps for independent coffee shops: menu, mobile order-ahead,
and a Starbucks-style rewards program._

_Drafted 2026-07-03. Working company name "Brew Local" is a placeholder — rename anytime.
The demo app uses a fictional shop, "Bluebird Coffee Co."_

---

## 1. The pitch (to a shop owner)

> "Your customers already love the Starbucks app — order ahead, skip the line,
> earn stars. I give **your** shop that exact experience, under **your** name and
> logo, for less than the cost of one barista shift per month. You keep your
> regulars out of the Starbucks line and learn who your best customers are."

## 2. Product model (decided)

- **White-label: each shop gets its own branded app** (their name, logo, colors).
- **Start standalone:** payments via Stripe; the shop receives orders on a
  simple web dashboard on any tablet/phone. **POS integration (Square first)
  comes after the first paying customers.**
- One shared codebase + backend serves every shop; each app is a thin branded
  shell over it (config: logo, colors, menu, reward rules).

### ⚠️ Key real-world constraint: Apple's "white-label" rule
Apple App Store Guideline **4.2.6/4.3** rejects "cookie-cutter" apps published
from one developer account. The standard industry workaround (used by Per Diem,
Craver, etc.):
- Publish each shop's iOS app **under the shop's own Apple Developer account**
  ($99/yr, the shop pays it) — Apple explicitly allows this.
- Or start each client on the **web app (PWA)** + Android, add iOS once they're paying.
This is a setup-checklist item, not a blocker — but price the onboarding to cover it.

## 3. Who else does this (competition) & why we can win

| Competitor | What it is | Typical price | Our angle |
|---|---|---|---|
| Square Loyalty + Online | Add-on to Square POS | ~$45+/mo + fees | No real branded app; generic experience |
| Joe Coffee | Shared coffee marketplace app | % per order (~9–12%) | Shops don't get their own app or their customer data |
| Per Diem | White-label apps (Square-centric) | ~$99–$399/mo | Same model — we win locally on service, price, personal onboarding |
| Craver | White-label apps | ~$199+/mo + setup | Same — they're big/impersonal; we're local and hands-on |
| Toast Mobile Ordering | Add-on for Toast POS shops | Bundled/varies | Only for Toast shops |

**Positioning:** the local, hands-on option. You personally onboard each shop,
photograph the menu, tune the rewards, and answer the phone. National players can't.

## 4. MVP feature set

**Customer app (v1):**
- Branded home screen: shop logo/colors, hours, location(s)
- Menu with categories, photos, prices, item customizations (size, milk, extras)
- Cart → pickup time → Stripe payment → order confirmation & status
- Rewards: earn points per $ (default **2 pts per $1**), progress bar,
  redeemable tiers (e.g., 50 = free drip, 100 = free pastry, 150 = any drink),
  plus shop-configurable "deals" (double-point days, birthday reward)
- Order history & re-order

**Shop dashboard (v1):**
- Live incoming orders (new → preparing → ready), sound alert
- Menu editor (86 an item, edit prices)
- Rewards settings (points rate, reward tiers, deals)
- Basic customer list: top customers, points balances

**Explicitly NOT in v1:** delivery, POS integration, gift cards, multi-location
chains, tipping payout logic beyond Stripe defaults, iOS push (web push +
Android first if we start PWA).

## 5. Pricing (starting hypothesis — validate with first 5 shops)

- **Setup: $499 one-time** (branding, menu entry, app-store submission, staff training)
- **SaaS: $149/mo** flat (or $99/mo founding-customer rate for the first 5 shops)
- Payment processing: shop pays standard Stripe fees (~2.9% + 30¢); we add **0%**
  initially (simpler pitch: "we don't take a cut of your sales")
- Break-even math for a shop: if the app lifts revenue just **$5–10/day**
  (one extra order), it pays for itself.

## 6. Go-to-market (first 90 days)

1. **Weeks 1–2 — Demo & validate:** show the Bluebird demo (this repo) to 5–10
   local owners. Ask: "Would you pay $99/mo for this with your name on it?"
   Collect 2–3 letters of intent / deposits before heavy building.
2. **Weeks 3–8 — Build real MVP** (customer app + dashboard + Stripe + rewards)
   with the first shop as design partner (free or discounted 3 months).
3. **Weeks 9–12 — Launch shop #1**, table tent + QR codes at the register,
   staff push ("download our app, first coffee 50 pts free"). Measure weekly
   active users + orders. Use results as the case study to sell shops #2–5.

**Sales channel:** walk in during the 2–4pm lull, buy a coffee, show the demo
on your phone. This is a face-to-face local business — that's the moat.

## 7. Tech plan (kept boring on purpose)

- **Customer app:** React + Vite PWA, wrapped with Capacitor for iOS/Android
  (same stack already used in this repo, so it's proven here)
- **Backend:** Node/Express + SQLite→Postgres, Stripe Checkout + webhooks;
  one multi-tenant backend, `shop_id` on every row
- **Dashboard:** same React app, shop-staff login role
- **Per-shop config** (branding/menu/rewards) lives in the backend; building a
  new shop's app = new config + icons + store listing, zero new code

## 8. Milestones / decision gates

- **Gate 1:** 3+ shops say "yes at $99/mo" after seeing the demo → build MVP.
  Fewer than 3 → adjust pitch/price before writing more code.
- **Gate 2:** Shop #1 does 100+ app orders/month by week 12 → start selling
  #2–5. If not → fix adoption (staff prompts, signage, reward generosity).
- **Gate 3:** 5 paying shops (~$750 MRR) → build Square integration, raise price
  to $149–199 for new shops.

## 9. Open questions (revisit with real shop feedback)

- Points: flat per-$ vs. per-visit? (Per-visit "punch card" is simpler for some shops.)
- Do shops want SMS/push blast tools ("slow Tuesday? send a 2x-points push")? Likely a paid add-on later.
- Charge for iOS from day one, or PWA+Android first to dodge the Apple $99/shop friction?

---

## Status

- ✅ This plan
- ✅ Clickable demo app (`coffee-shop/demo/index.html`) — fictional "Bluebird
  Coffee Co." brand: menu, customization, cart, checkout, order status, rewards
- ⬜ Show demo to first shop owners
- ⬜ Real MVP build (customer app + shop dashboard + Stripe)
