# Legal & Data-Safety Notes (founder's copy)

_Plain-language guide to staying out of trouble. **Not legal advice** — when
real money starts flowing, spend ~$200–400 having a small-business lawyer
review your founding agreement and these basics. Cheap insurance._

## What the app collects — and deliberately does NOT

Collected (the minimum for the product to work):
- Customer first name (for the cup), phone number (rewards ID), order history.
- Shop staff: a PIN, no personal accounts yet.

Deliberately NOT collected — this is your best legal protection:
- **No card numbers, ever.** Payments happen on Stripe's hosted page; PCI
  compliance burden stays with Stripe (this is exactly what Stripe Checkout
  is for). Never build a form that takes card numbers directly.
- No passwords, no email addresses, no birthdays (the "birthday reward" can
  use just a month), no location tracking, no ad trackers or analytics
  cookies. The less you hold, the less you can leak.

## Protections already built into the app (done, verified by test)

- **Phone-number lookups are locked down.** Knowing someone's phone number
  reveals nothing but a star count. Name + order history require a private
  device token issued only when that phone actually places an order.
- **Staff PIN is rate-limited** (10 tries per 15 min per connection) so it
  can't be brute-forced; order and lookup endpoints are rate-limited too.
- **Phone numbers are masked** in the dashboard UI ((•••) •••-5309).
- **All prices are computed server-side** — a tampered app can't buy a $5
  latte for $0.01 or forge star balances.
- **HTTPS everywhere** (Railway terminates TLS), security headers set.
- **A plain-English privacy policy ships inside the app** at `/privacy`,
  linked from the Rewards screen — including a delete-my-data promise.

## Rules of the road (things that DO get small platforms in trouble)

1. **TCPA / texting:** the app never sends SMS — keep it that way unless
   customers explicitly opt in. Unsolicited marketing texts carry
   $500–$1,500 statutory damages PER TEXT in the US. When you add push/SMS
   marketing later, make it opt-in with a clear unsubscribe.
2. **Honor deletions:** the privacy policy promises data deletion on request.
   When a shop gets such a request, tell me — removing a customer record
   takes a minute. Never ignore one.
3. **Sales tax is the shop's**, collected in their name through their Stripe
   — you're a software vendor, not the merchant of record. Keep it that way;
   becoming the merchant of record creates tax and money-transmitter
   obligations you do not want.
4. **Don't hold funds.** Money must always flow customer → shop's Stripe →
   shop's bank. If you ever route funds through YOUR account "temporarily,"
   you step into money-transmitter territory. The architecture already
   prevents this — don't work around it.
5. **Demo data is real data.** Anyone who tests your Bluebird demo with a
   real name/phone is in your database. Before pitching season ends, wipe the
   demo's data folder, or tell testers to use fake numbers. (Ask me to add a
   wipe button if you want one.)
6. **Own the LLC before real revenue** (already on your checklist) and sign
   shop agreements as the LLC, not personally.
7. **Allergy/nutrition claims:** don't put "gluten-free/nut-free" labels in
   menus you enter for shops unless the shop explicitly provides them — a
   wrong allergen label is real liability. Menu wording is the shop's
   responsibility; keep it that way in your founding agreement.
8. **Trademark hygiene:** each shop's name/logo belongs to them — your
   agreement should say they license it to you for building their app (one
   line, already implied; make it explicit when a lawyer reviews).

## When to level up (not yet — triggers to watch)

- **5+ shops or ~1,000+ customer records** → move storage to a managed
  Postgres with backups; add per-employee dashboard logins.
- **First marketing push feature** → build the SMS/push opt-in flow properly.
- **A shop in the EU/UK or California asks about GDPR/CCPA** → the current
  minimal-data design already covers the spirit; add a formal data-processing
  addendum then (small shops under CCPA thresholds are generally exempt).
- **Revenue > hobby scale** → general liability + E&O insurance (~$50/mo)
  and the lawyer pass on all templates.
