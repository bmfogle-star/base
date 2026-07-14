// Spark self-hosted meeting bot server.
//
// Exposes a tiny REST API the Spark app calls to dispatch a bot into a
// meeting. The bot joins, records audio, and when the call ends it posts the
// recording (and optional transcript) back to a callback URL the app provides.
//
// This replaces the paid Recall.ai dependency. See README.md for hosting.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { runMeetBot } from './meetBot.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Simple shared-secret auth so randoms can't spin up bots on your server.
// Fails closed: with no BOT_API_TOKEN configured, every request is rejected
// rather than letting the server run wide open.
const API_TOKEN = process.env.BOT_API_TOKEN || '';
if (!API_TOKEN) console.error('BOT_API_TOKEN is not set — rejecting all API requests until it is.');
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!API_TOKEN || token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// In-memory job registry. For production, back this with a database.
const jobs = new Map();

app.get('/health', (_req, res) => res.json({ ok: true }));

// Dispatch a bot to a meeting.
// Body: { meetingUrl, clientId, callbackUrl, botName? }
app.post('/bots', async (req, res) => {
  const { meetingUrl, clientId, callbackUrl, botName } = req.body || {};
  if (!meetingUrl) return res.status(400).json({ error: 'meetingUrl is required' });

  const id = randomUUID();
  const job = { id, meetingUrl, clientId, callbackUrl, status: 'joining', createdAt: Date.now() };
  jobs.set(id, job);

  // Kick off the bot in the background; respond immediately so the app can poll.
  runMeetBot({
    meetingUrl,
    botName: botName || 'Spark Recorder',
    onStatus: (status) => { job.status = status; },
    onDone: async ({ audioPath, transcript }) => {
      job.status = 'done';
      job.transcript = transcript || null;
      job.audioPath = audioPath || null;
      if (callbackUrl) {
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId: id, clientId, status: 'done', transcript }),
          });
        } catch (e) {
          console.error('Callback failed:', e.message);
        }
      }
    },
    onError: (err) => { job.status = 'error'; job.error = err.message; },
  }).catch((e) => { job.status = 'error'; job.error = e.message; });

  res.json({ id, status: job.status });
});

// Poll bot status (mirrors the shape the app already expects).
app.get('/bots/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ id: job.id, status: job.status, error: job.error || null });
});

// Fetch the transcript once the bot is done.
app.get('/bots/:id/transcript', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.status !== 'done') return res.status(409).json({ error: 'Not ready', status: job.status });
  res.json({ transcript: job.transcript });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Spark bot server listening on :${PORT}`));
