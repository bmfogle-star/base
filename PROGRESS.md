# Spark — Progress & Next Steps

_Last updated: 2026-06-17_

A sales CRM for individual salespeople / small teams. Track clients' personal
details (hobbies, family, events) to feel more personable, with AI that extracts
those details from recorded calls.

**Pricing:**
- **Premium — $4.99/mo:** up to 20 clients, full AI + bots.
- **Platinum — $11.99/mo:** unlimited clients (for 20+).

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

Client records are stored locally on the device (localStorage). The backend (when
configured) handles identity, the AI key, limits, and billing — not client data yet.

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

---

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
