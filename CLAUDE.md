# Project Context

## Who I'm working with
Brayden runs an app/web development agency targeting local businesses — primarily
coffee shops and cafés (mostly in Indiana). The pitch: custom apps/websites with
online ordering and rewards programs that integrate with the shop's existing POS,
to improve customer retention and convenience.

## What's in this repo
- **Spark** — a sales/CRM app (React + Vite frontend in `src/`, Capacitor builds
  for iOS/Android in `ios/`/`android/`) for tracking clients, recording calls,
  and drafting follow-ups with Claude.
- `backend/` — Node/Express + SQLite API (auth, AI proxy, Stripe billing).
  Secrets live in `.env` (never committed); frontend has no `VITE_` secrets.
- `server/` — self-hosted meeting-bot server (Puppeteer recording + transcription).
- `coffee-shop-contacts.csv` — 55 Indiana coffee shop owners: name, phone, shop.
- `outreach-messages.md` — personalized outreach message per contact, ready to
  copy-paste for manual sending.

## Working conventions
- Develop on the branch assigned per session; commit and push when work is done.
- Deliverables the user will reuse (lists, drafts, reports) get committed to the
  repo, not left in scratch space.
- Outreach compliance: no automated SMS to non-opted-in contacts (TCPA).
  Cold email is the preferred bulk channel (CAN-SPAM). Manual one-to-one texts
  are the user's call. Six contacts on the list are not coffee shops (Nelson's
  Tea, Cheeky Bastards, Be Happy Pie, Village Deli, Zax Creamery, Rise'n Roll) —
  adapt "coffee shop" copy before contacting them.

## Outreach message template (approved by Brayden)
> Hi {FirstName},
>
> My name's Brayden — I run an app development agency that works specifically
> with local coffee shops. We build custom apps with online ordering and rewards
> programs that plug into your existing POS, so regulars at {ShopName} can order
> ahead and rack up points without you changing how you operate.
>
> If that sounds useful, I'd be happy to send over a quick example of what an
> app for {ShopName} could look like — no strings attached.
>
> Thanks,
> Brayden
