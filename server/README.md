# Spark Bot Server

A self-hosted meeting bot that replaces the paid Recall.ai service. It joins a
Google Meet call as a guest, records the audio, and posts the transcript back to
the Spark app.

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

## Deploy to Fly.io (recommended — ~$5/mo)

The included `fly.toml` + `Dockerfile` set up everything (Chrome, virtual
display, audio sink, a persistent volume for recordings).

**One-time setup:**

```bash
curl -L https://fly.io/install.sh | sh   # install the flyctl CLI
fly auth login                           # log into (or create) your Fly account
```

**Deploy** — from inside the `server/` directory:

```bash
cd server
./deploy-fly.sh                # uses a default app name
# or pick your own name + region:
./deploy-fly.sh my-bot-server iad
```

The script creates the app, a 1GB recordings volume, generates a secret
token, and deploys. When it finishes it prints your **bot server URL** and
**token** — paste both into Spark → Settings → Meeting bot.

> Fly's free allowance has shrunk over time, so expect roughly $3–5/month for a
> single always-on 1GB machine. Still cheaper than Recall.ai, with no per-minute fees.

## Deploy with plain Docker (any VPS)

The `Dockerfile` works anywhere Docker runs:

```bash
docker build -t spark-bot .
docker run -p 4000:4000 --env-file .env spark-bot
```

## Wire it into the app

In Spark → Settings → "Bot server URL", enter your server's address
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
