// The key proxy — the whole reason the backend exists.
// Takes a transcript from an authenticated user, calls Claude with OUR secret
// key, and returns extracted client details. Enforces the user's plan limit.
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { canUseAI, incrementAI, getUsage } from '../usage.js';

const router = Router();

const EXTRACTION_PROMPT = (transcript) =>
  `You are a sales assistant. Extract key personal details from this sales call transcript to help a salesperson build rapport.\n\nExtract and list:\n- Client name(s)\n- Hobbies and interests\n- Family members (names and relationships)\n- Upcoming personal events or milestones\n- Personal life details\n- Key business concerns or goals\n- Any other rapport-building details\n\nOnly include things actually mentioned. Skip categories with nothing to report.\n\nTranscript:\n${transcript}`;

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
