// AI-drafted follow-up email based on a call transcript.
// Uses the backend when signed in, else the personal Claude key (BYOK).
import { isLoggedIn, followupEmailViaBackend } from './api';

async function draftDirect(transcript, clientName, senderName, apiKey) {
  if (!apiKey) throw new Error('Add your Claude API key in Settings (or sign in) to draft emails.');
  const p = `Write a warm, concise follow-up email to ${clientName || 'the client'} after this sales call. Reference specific things discussed (personal details and business points) to feel genuine and personable. Keep it short (under 150 words), friendly, and end with a clear next step. ${senderName ? `Sign off as ${senderName}.` : ''} Return ONLY the email text (subject line first, prefixed "Subject:").\n\nTranscript:\n${transcript}`;
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
      max_tokens: 600,
      messages: [{ role: 'user', content: p }],
    }),
  });
  if (!res.ok) throw new Error(`Email draft failed (${res.status})`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export async function draftFollowupEmail(transcript, clientName, senderName, apiKey) {
  if (isLoggedIn()) return followupEmailViaBackend(transcript, clientName, senderName);
  return draftDirect(transcript, clientName, senderName, apiKey);
}
