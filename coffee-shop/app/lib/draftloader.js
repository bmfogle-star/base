/*
 * One-shot Gmail drafts loader — stages the outreach queue as DRAFTS in
 * the founder's Gmail instead of sending anything. The founder reviews
 * and taps Send himself.
 *
 * Uses the same GMAIL_USER + GMAIL_APP_PASSWORD already in Railway
 * Variables, over IMAP (imap.gmail.com). Runs once at boot when
 * DRAFT_LOAD=1; remembers what it has staged in
 * DATA_DIR/draftload-state.json so redeploys never create duplicates.
 *
 * To stage a new/updated campaign: update outreach/queue.json, push,
 * ensure DRAFT_LOAD=1. Emails are keyed by to+subject, so a reworded
 * body with the same subject will NOT restage (delete the old draft and
 * bump the subject, or clear the state file, to force it).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'draftload-state.json');
const QUEUE_FILE = path.join(__dirname, '..', 'outreach', 'queue.json');

function emailId(e) {
  return crypto.createHash('sha1').update(e.to + '\n' + e.subject).digest('hex').slice(0, 12);
}

async function run() {
  if (process.env.DRAFT_LOAD !== '1') {
    console.log('[drafts] loader off (set DRAFT_LOAD=1 to stage the queue as Gmail drafts)');
    return { staged: 0 };
  }
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[drafts] GMAIL_USER / GMAIL_APP_PASSWORD not set — cannot stage drafts');
    return { staged: 0 };
  }

  let queue;
  try {
    queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch (e) {
    console.warn('[drafts] no readable queue.json');
    return { staged: 0 };
  }
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) {}

  const todo = queue.filter(e => e && e.to && e.subject && e.body && !state[emailId(e)]);
  if (!todo.length) {
    console.log('[drafts] nothing new to stage (' + queue.length + ' already done or queue empty)');
    return { staged: 0 };
  }

  const { ImapFlow } = require('imapflow');
  const MailComposer = require('nodemailer/lib/mail-composer');
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user, pass }, logger: false,
  });

  console.log('[drafts] staging ' + todo.length + ' drafts into ' + user + ' ...');
  let staged = 0;
  await client.connect();
  try {
    for (const e of todo) {
      const raw = await new MailComposer({
        from: user, to: e.to, subject: e.subject, text: e.body,
      }).compile().build();
      await client.append('[Gmail]/Drafts', raw, ['\\Draft']);
      state[emailId(e)] = Date.now();
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state));
      staged++;
      console.log('[drafts] staged ' + staged + '/' + todo.length + ': ' + e.to);
    }
    console.log('[drafts] ✅ done — ' + staged + ' drafts now in the Gmail Drafts folder');
  } finally {
    await client.logout().catch(() => {});
  }
  return { staged };
}

module.exports = { run, emailId };
