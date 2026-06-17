# ClientIQ Bot Server

A self-hosted meeting bot that replaces the paid Recall.ai service. It joins a
Google Meet call as a guest, records the audio, and posts the transcript back to
the ClientIQ app.

## What it costs

The **code is free**. But a meeting bot is a real Chrome browser that has to stay
running to sit in calls, so it needs an always-on server:

- **~$5/month VPS** (DigitalOcean, Hetzner, Fly.io, Railway) is plenty for a small team.
- No per-minute fees, unlike Recall.ai.

There is no way to run a meeting bot on free static hosting (GitHub Pages, Netlify,
etc.) — those don't run servers.

## Platform support

| Platform | Status |
|---|---|
| Google Meet | ✅ Supported (guest join) |
| Zoom | ⚠️ Best-effort — Zoom pushes native app, often blocks guest bots |
| Microsoft Teams | ⚠️ Best-effort — same issues as Zoom |

For Zoom/Teams, the reliable fallback is: use the platform's own "Record" button,
then upload the file in the app (free in-browser transcription handles the rest).

## Run locally (for testing)

```bash
cd server
cp .env.example .env        # then edit BOT_API_TOKEN
npm install
npm start
```

## Deploy with Docker (recommended)

The bot needs a virtual display (Xvfb) and audio sink (PulseAudio) to capture
tab audio — the included `Dockerfile` sets all of that up.

```bash
docker build -t clientiq-bot .
docker run -p 4000:4000 --env-file .env clientiq-bot
```

Point your $5 droplet / Fly app at this image and you're live.

## Wire it into the app

In ClientIQ → Settings → "Bot server URL", enter your server's address
(e.g. `https://your-server.com`) and the same token you set as `BOT_API_TOKEN`.
The app will dispatch bots to your server instead of Recall.ai.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health` | Health check (no auth) |
| `POST` | `/bots` | Dispatch a bot. Body: `{ meetingUrl, clientId, callbackUrl?, botName? }` |
| `GET`  | `/bots/:id` | Poll status: `joining → recording → processing → done` |
| `GET`  | `/bots/:id/transcript` | Fetch transcript once `done` |

All routes except `/health` require `Authorization: Bearer <BOT_API_TOKEN>`.

## Fully-free transcription on the server

Set `WHISPER_CPP_PATH` to a [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
build and wire it into `transcribeIfConfigured()` in `meetBot.js`. Then transcription
also costs $0 — it runs on your own server instead of calling a paid API.
