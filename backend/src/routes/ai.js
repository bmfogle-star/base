// The key proxy — the whole reason the backend exists.
// Takes a transcript from an authenticated user, calls Claude with OUR secret
// key, and returns extracted client details. Enforces the user's plan limit.
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { canUseAI, incrementAI, getUsage } from '../usage.js';

const router = Router();

const EXTRACTION_PROMPT = (transcript) =>
  `You are a sales assistant. Extract key personal details from this sales call transcript to help a salesperson build rapport.\n\nExtract and list:\n- Client name(s)\n- Hobbies and interests\n- Family members (names and relationships)\n- Upcoming personal events or milestones\n- Personal life details\n- Key business concerns or goals\n- Any other rapport-building details\n\nOnly include things actually mentioned. Skip categories with nothing to report.\n\nTranscript:\n${transcript}`;

const CARD_PROMPT = `You are reading a business card. Extract the contact details and return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{"name":"","phone":"","email":"","company":"","position":"","website":"","address":""}
Use an empty string for anything not present on the card.`;

router.post('/business-card', requireAuth, async (req, res) => {
  const { image } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image is required' });
  if (!canUseAI(req.user)) {
    return res.status(429).json({ error: 'Monthly AI limit reached. Upgrade to Platinum for more.', usage: getUsage(req.user.id) });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing its AI key' });

  const [meta, base64] = String(image).split(',');
  const mediaType = (meta.match(/data:(.*?);/) || [])[1] || 'image/jpeg';

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: CARD_PROMPT },
        ] }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: `AI provider error ${r.status}` });
    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not read the card' });
    incrementAI(req.user.id);
    res.json({ contact: JSON.parse(match[0]), usage: getUsage(req.user.id) });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach AI provider', detail: e.message });
  }
});

router.post('/talking-points', requireAuth, async (req, res) => {
  const { profile } = req.body || {};
  if (!profile?.trim()) return res.status(400).json({ error: 'profile is required' });
  if (!canUseAI(req.user)) return res.status(429).json({ error: 'Monthly AI limit reached.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing its AI key' });

  const p = `You are prepping a salesperson before they contact this client. From the profile below, write a short, scannable cheat sheet of rapport-building talking points and reminders (personal details to mention, follow-ups from last call, things to ask about). Use 4-7 short bullet points starting with "- ". Be specific; only use what's in the profile.\n\nProfile:\n${profile}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: p }] }),
    });
    if (!r.ok) return res.status(502).json({ error: `AI provider error ${r.status}` });
    const data = await r.json();
    incrementAI(req.user.id);
    res.json({ points: data.content?.[0]?.text || '' });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach AI provider', detail: e.message });
  }
});

router.post('/followup-email', requireAuth, async (req, res) => {
  const { transcript, clientName, senderName } = req.body || {};
  if (!transcript?.trim()) return res.status(400).json({ error: 'transcript is required' });
  if (!canUseAI(req.user)) return res.status(429).json({ error: 'Monthly AI limit reached.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing its AI key' });

  const p = `Write a warm, concise follow-up email to ${clientName || 'the client'} after this sales call. Reference specific things discussed (personal details and business points) to feel genuine and personable. Keep it short (under 150 words), friendly, and end with a clear next step. ${senderName ? `Sign off as ${senderName}.` : ''} Return ONLY the email text (subject line first, prefixed "Subject:").\n\nTranscript:\n${transcript}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: p }] }),
    });
    if (!r.ok) return res.status(502).json({ error: `AI provider error ${r.status}` });
    const data = await r.json();
    incrementAI(req.user.id);
    res.json({ email: data.content?.[0]?.text || '' });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach AI provider', detail: e.message });
  }
});

router.post('/extract-events', requireAuth, async (req, res) => {
  const { transcript } = req.body || {};
  if (!transcript?.trim()) return res.status(400).json({ error: 'transcript is required' });
  if (!canUseAI(req.user)) return res.status(429).json({ error: 'Monthly AI limit reached.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing its AI key' });

  const today = new Date().toISOString().slice(0, 10);
  const p = `Today is ${today}. From this sales call transcript, extract any concrete meetings/events that were scheduled. Return ONLY a JSON array; each item {"title":"","start":"YYYY-MM-DDTHH:MM","notes":""}. Resolve relative dates against today; default time 09:00; return [] if none.\n\nTranscript:\n${transcript}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: p }] }),
    });
    if (!r.ok) return res.status(502).json({ error: `AI provider error ${r.status}` });
    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    const m = text.match(/\[[\s\S]*\]/);
    incrementAI(req.user.id);
    res.json({ events: m ? JSON.parse(m[0]) : [] });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach AI provider', detail: e.message });
  }
});

router.post('/extract', requireAuth, async (req, res) => {
  const { transcript } = req.body || {};
  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  // Enforce monthly plan limit before spending any money.
  if (!canUseAI(req.user)) {
    return res.status(429).json({
      error: 'Monthly AI limit reached for your plan. Upgrade to Platinum for more.',
      usage: getUsage(req.user.id),
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing its AI key' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: EXTRACTION_PROMPT(transcript) }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: `AI provider error ${r.status}`, detail });
    }

    const data = await r.json();
    incrementAI(req.user.id); // only count successful calls
    res.json({ extracted: data.content?.[0]?.text || '', usage: getUsage(req.user.id) });
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach AI provider', detail: e.message });
  }
});

export default router;
