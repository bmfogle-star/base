// Detect meetings/events mentioned in a call transcript and turn them into
// calendar events. Uses Claude (backend when signed in, else BYOK key).
import { isLoggedIn, extractEventsViaBackend } from './api';

function prompt(transcript) {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}. From this sales call transcript, extract any concrete meetings, calls, or events that were scheduled or agreed on (e.g. "let's meet next Tuesday at 2pm", "I'll call you Friday morning").

Return ONLY a JSON array (no markdown). Each item:
{"title":"", "start":"YYYY-MM-DDTHH:MM", "notes":""}
- Resolve relative dates against today. If no time is given, use 09:00.
- If nothing concrete was scheduled, return [].

Transcript:
${transcript}`;
}

function parseArray(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}

async function extractDirect(transcript, apiKey) {
  if (!apiKey) return [];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt(transcript) }],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return parseArray(data.content?.[0]?.text || '');
}

// Returns an array of { title, start, notes }. Best-effort; never throws.
export async function extractCallEvents(transcript, apiKey) {
  try {
    if (isLoggedIn()) return await extractEventsViaBackend(transcript);
    return await extractDirect(transcript, apiKey);
  } catch {
    return [];
  }
}
