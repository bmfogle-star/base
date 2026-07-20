/*
 * Outreach mailer — sends the founder's queued sales emails from the
 * business Gmail at a human pace, so the pipeline runs without anyone
 * tapping Send.
 *
 * Safety model:
 *   - Completely inert unless OUTREACH_ENABLED=1 AND Gmail credentials
 *     are set (so the demo/other deploys can never send by accident).
 *   - Hard daily cap (OUTREACH_DAILY_CAP, default 5) — new-account-safe.
 *   - Weekdays only, 9am-5pm New York time, at least 45 min between
 *     sends, with a random skip so sends land at human-looking times.
 *   - Every sent email is remembered in DATA_DIR/outreach-state.json by
 *     a stable id, so redeploys and queue edits never double-send.
 *
 * Env:  OUTREACH_ENABLED=1
 *       GMAIL_USER            e.g. novadevelopment313@gmail.com
 *       GMAIL_APP_PASSWORD    Google App Password (Railway Variables ONLY)
 *       OUTREACH_DAILY_CAP    optional, default 5
 *
 * Queue: ../outreach/queue.json — array of { to, subject, body }; authored
 * in the repo, so adding a campaign = commit + push.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'outreach-state.json');
const QUEUE_FILE = path.join(__dirname, '..', 'outreach', 'queue.json');

const CAP = Math.max(1, parseInt(process.env.OUTREACH_DAILY_CAP || '5', 10) || 5);
// Spread the day's sends across the 9-5 window; never tighter than 3 min.
const WINDOW_MS = 8 * 3600e3;
const MIN_GAP_MS = Math.max(3 * 60e3, Math.floor(WINDOW_MS / (CAP * 2)));

function enabled() {
  return process.env.OUTREACH_ENABLED === '1' &&
    !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

function emailId(e) {
  return crypto.createHash('sha1').update(e.to + '\n' + e.subject).digest('hex').slice(0, 12);
}

function loadQueue() {
  try {
    const q = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    return Array.isArray(q) ? q.filter(e => e && e.to && e.subject && e.body) : [];
  } catch (e) {
    return [];
  }
}

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return { sent: s.sent || {}, lastSentAt: s.lastSentAt || 0 };
  } catch (e) {
    return { sent: {}, lastSentAt: 0 };
  }
}

function saveState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

// New York wall clock for pacing decisions.
function nyParts(now) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false,
    weekday: 'short', hour: 'numeric', year: 'numeric', month: 'numeric', day: 'numeric',
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date(now))) parts[p.type] = p.value;
  return {
    weekday: parts.weekday,
    hour: parseInt(parts.hour, 10) % 24,
    dayKey: parts.year + '-' + parts.month + '-' + parts.day,
  };
}

function sentTodayCount(state, dayKey) {
  let n = 0;
  for (const id of Object.keys(state.sent)) if (state.sent[id].day === dayKey) n++;
  return n;
}

async function sendViaGmail(e) {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: process.env.GMAIL_USER, to: e.to, subject: e.subject, text: e.body,
  });
}

/*
 * One pacing decision. Injectables (opts.now, opts.send, opts.random) exist
 * for tests; production callers pass nothing.
 * Returns 'sent' | reason-string for why nothing was sent.
 */
async function tick(opts = {}) {
  const now = opts.now !== undefined ? opts.now : Date.now();
  const send = opts.send || sendViaGmail;
  const random = opts.random || Math.random;

  if (!enabled()) return 'disabled';
  const t = nyParts(now);
  if (t.weekday === 'Sat' || t.weekday === 'Sun') return 'weekend';
  if (t.hour < 9 || t.hour >= 17) return 'off-hours';

  const state = loadState();
  if (now - state.lastSentAt < MIN_GAP_MS) return 'too-soon';
  if (sentTodayCount(state, t.dayKey) >= CAP) return 'daily-cap';
  if (random() < 0.4) return 'random-skip'; // human-looking spread

  const next = loadQueue().find(e => !state.sent[emailId(e)]);
  if (!next) return 'queue-empty';

  await send(next);
  state.sent[emailId(next)] = { day: t.dayKey, at: now, to: next.to };
  state.lastSentAt = now;
  saveState(state);
  console.log('[outreach] sent to ' + next.to + ' (' + sentTodayCount(state, t.dayKey) + '/' + CAP + ' today)');
  return 'sent';
}

function status() {
  const state = loadState();
  const queue = loadQueue();
  const remaining = queue.filter(e => !state.sent[emailId(e)]);
  const t = nyParts(Date.now());
  return {
    enabled: enabled(),
    dailyCap: CAP,
    queued: queue.length,
    remaining: remaining.length,
    sentTotal: queue.length - remaining.length,
    sentToday: sentTodayCount(state, t.dayKey),
    lastSentAt: state.lastSentAt || null,
    nextUp: remaining[0] ? { to: remaining[0].to, subject: remaining[0].subject } : null,
  };
}

function start() {
  if (!enabled()) {
    console.log('[outreach] disabled (set OUTREACH_ENABLED=1 + GMAIL_USER + GMAIL_APP_PASSWORD to activate)');
    return null;
  }
  console.log('[outreach] active: ' + status().remaining + ' emails queued, cap ' + CAP + '/day, weekdays 9-5 ET');
  if (CAP > 20) console.warn('[outreach] ⚠ cap ' + CAP + '/day is HIGH for a plain Gmail account — spam-flag risk. 10-15 is the safe ceiling without a warmed-up custom domain.');
  const intervalMs = Math.min(20 * 60e3, Math.max(2 * 60e3, Math.floor(MIN_GAP_MS / 2)));
  const timer = setInterval(() => {
    tick().catch(err => console.error('[outreach] send failed:', err.message));
  }, intervalMs);
  timer.unref();
  return timer;
}

module.exports = { start, tick, status, emailId, loadQueue };
