# Spark — Progress & Next Steps

_Last updated: 2026-06-18 (paused for the night)_

A sales CRM for individual salespeople / small teams. Track clients' personal
details (hobbies, family, events) to feel more personable, with AI that extracts
those details from recorded calls.

**Pricing (no free tier):**
- **Premium — $4.99/mo:** up to 20 clients, 4 devices.
- **Platinum — $11.99/mo:** unlimited clients, 8 devices.
- **Enterprise:** $500/mo up to 50 employees, $1,000/mo for 51+. Unlimited devices, team sharing, SSO.

**Live app:** https://bmfogle-star.github.io/base/
**Branch:** `claude/stoic-babbage-y8jhtg`

---

## ✅ What's built and shipped

- **Mobile-first web app** (React + Vite + Tailwind), auto-deploys to GitHub
  Pages on every push via `.github/workflows/deploy.yml`.
- **Client management** — list, search, star, add/edit, full profiles with
  contact info, hobbies, family members, upcoming events, tags, notes, call history.
- **Dashboard** — stats + recent clients.
- **Call recorder with 3 modes:**
  1. **Live mic** — browser speech recognition, real-time.
  2. **Upload a recording** — any audio/video file. Transcribes with FREE
     in-browser Whisper (transformers.js, runs on device) by default, or paid
     OpenAI Whisper for speed.
  3. **Zoom/Meet/Teams bot** — dispatches a bot to join + record + transcribe.
- **AI extraction** — Claude pulls names, hobbies, family, events from transcripts.
- **Settings** — stores API keys locally (Claude, OpenAI, bot server URL+token,
  Recall.ai fallback), profile, Premium ($4.99) vs Platinum ($11.99) plan UI.
- **Self-hostable bot server** in `/server` — Express + Puppeteer Google Meet
  bot. Dockerfile (Chrome + Xvfb + PulseAudio), Fly.io config (`fly.toml`),
  one-shot deploy script (`deploy-fly.sh`). Replaces paid Recall.ai.
- **SaaS backend scaffold** in `/backend` (see BACKEND.md) — Express + SQLite:
  JWT auth (register/login/me), `/ai/extract` proxy that holds the server-side
  Claude key and enforces per-plan monthly limits, Stripe checkout/webhook stubs.
- **Frontend ↔ backend wiring** — `src/lib/api.js`, `useAuth` hook, `AccountCard`
  (login/signup + plan/usage) in Settings, plus a "Spark Backend URL" field.
  CallRecorder routes extraction through the backend when signed in, else uses
  the personal key (BYOK). Backend is OPTIONAL — app still works without it.

- **Client cloud sync** — `/backend/src/routes/clients.js` stores client records
  server-side; `src/lib/sync.js` does two-way last-write-wins sync. Runs whenever
  signed in: personal accounts sync across their own devices/logins; enterprise
  (org) accounts share clients across the team. Local storage stays the UI source.
- **Enterprise scaffold** (see ENTERPRISE.md) — orgs, roles, seats, invites,
  custom fields/branding settings; `/orgs` routes.
- **Device limit** — `/backend/src/routes/devices.js`: Premium 4 devices,
  Platinum 8, Enterprise unlimited. App registers each device on sync and shows
  an upgrade banner if the limit is hit. New signups default to Premium.
  No Free tier.
- **Enterprise join/create** — orgs get a 6-char shareable join code.
  Settings → Subscription has "Join an Enterprise" (enter code) and
  "Create an Enterprise" (name it → get code). `/orgs/join` route.
- **Admin console** — `src/pages/AdminConsole.jsx`, opened via "Manage Team &
  Admin" in the account card. Shows invite code (copy), seats used + monthly
  price ($500 ≤50 / $1,000 51+), seat management, member role changes, and
  customization (company name, accent color, custom client fields).
- **Business card scan** (`ScanCard`) + **contacts import** (`ImportContacts`,
  vCard/Contact Picker) on the Clients page.
- **Client attachments** — photos (camera/library, auto-compressed) + any file
  on each client; indicators on list + profile header.
- **Call history** — title, full date+time (editable), pin-to-top, sort
  (recent/oldest/custom with manual reorder).
- **Clients page** = A–Z directory with a Favorites (starred) section on top.
  Home page has an Add Client button.
- **Calendar tab** (`src/pages/Calendar.jsx`) — month view, create/edit/delete
  events, auto-save. Apple/Google sync via .ics download + Google "add event"
  link (`src/lib/ics.js`). Events mentioned on calls are auto-added
  (`src/lib/callEvents.js` + `/ai/extract-events`). Events cloud-sync like
  clients (`/backend/src/routes/events.js`, `syncEvents`). Enterprise: admins
  set an event audience — Just me / Everyone / specific people; display is
  filtered by audience + creator. Org branding (logo/color) applies app-wide.
- **Org branding** — admins upload a logo + primary color in the admin console;
  applied in the header (logo, company name, accent strip) for org members.
- **Persistent login** — 90-day rolling JWT session (refreshed on each use).

Local storage is the UI source of truth; the backend (when configured) adds
identity, the AI key, limits, billing, cloud sync, org sharing, and device limits.

Branding: green theme (#15803d), Spark logo (`public/favicon.svg`).
Pricing (NO free tier): Premium $4.99 (4 devices) · Platinum $11.99 (8 devices) ·
Enterprise $500/mo ≤50 employees, $1,000/mo 51+ (unlimited devices, team sharing).

---

## ▶️ NEXT STEPS (where we left off)

### Part 1 — Start using the app (free, ~5 min) — DO THIS FIRST
1. Open https://bmfogle-star.github.io/base/
2. Get a Claude API key at console.anthropic.com → paste into Settings → Claude API Key → Save.
   (Costs fractions of a cent per call; set a $5 cap on Anthropic's site.)
3. Test the loop: Add a client → Record tab → Upload a recording (keep "Free & private") → Save to Client.

### Part 2 — Deploy the meeting bot (optional, ~$4/mo) — only if auto-join needed
Run on your own computer (needs your Fly login + a card):
```
curl -L https://fly.io/install.sh | sh
fly auth login
cd server && ./deploy-fly.sh
```
Then paste the printed URL + token into Settings → Meeting bot.

### Part 3 — Deploy the SaaS backend (to make accounts/sync/orgs/billing live)
Everything backend-related (accounts, cloud sync, device limits, enterprise
orgs, admin console, Stripe) is BUILT but only activates once the backend is
deployed and its URL is set in Settings → Spark Backend URL.
1. Deploy `/backend` (Fly.io/Railway) with `ANTHROPIC_API_KEY` + `JWT_SECRET`.
2. For billing: add Stripe keys + Premium/Platinum price IDs to `/backend/.env`.
3. Paste the backend URL into the app's Settings.

---

## 🔜 RESUME HERE (next session)
Paused 2026-06-18 for the night. Last thing built: enterprise admin console.
Open thread we stopped on:
- **Make custom fields actually render** on the client profile + Add Client
  forms (admin defines them in the console; they're stored but not yet shown
  on client forms). This was the proposed next task.
Other good candidates: apply org branding (company name/accent) in the app;
build the launch checklist doc; wire Stripe price→plan mapping robustly.

## 💡 Ideas / open questions for tomorrow

- Pre-fill a sample client so a finished profile is visible before real data entry.
- Tighten Zoom/Teams join logic (currently Meet-first; Zoom/Teams are best-effort).
- Deploy the `/backend` (Fly.io/Railway), set ANTHROPIC_API_KEY + JWT_SECRET,
  then put its URL in the app's Settings → Spark Backend URL.
- Wire real Stripe payments (account + Premium/Platinum price IDs) into
  `/backend/src/routes/billing.js`; connect the plan buttons to /billing/checkout.
- Enforce the 20-client limit on Premium + auto-nudge to Platinum past 20.
- Backend hardening: email verification, password reset, auth rate limiting.
- Optional cloud sync / multi-device (currently local-only).
- Auto-merge AI-extracted details into structured profile fields (currently saved
  as a text block in call history; could parse into hobbies/family/events arrays).

---

## Honest cost reality
- App + in-browser transcription: **free** (besides tiny Claude API cost).
- Meeting bot: needs an always-on server (~$3–5/mo VPS). No truly free option.
- Zoom/Teams block guest bots → use their Record button + upload (free) instead.
