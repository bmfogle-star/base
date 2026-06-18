// Extract contact details from a business card photo using Claude vision.
import { dataUrlParts } from './image';
import { isLoggedIn, extractCardViaBackend } from './api';

const PROMPT = `You are reading a business card. Extract the contact details and return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{"name":"","phone":"","email":"","company":"","position":"","website":"","address":""}
Use an empty string for anything not present on the card.`;

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not read the card. Try a clearer photo.');
  return JSON.parse(match[0]);
}

async function extractDirect(imageDataUrl, apiKey) {
  if (!apiKey) throw new Error('Add your Claude API key in Settings (or sign in) to scan cards.');
  const { mediaType, base64 } = dataUrlParts(imageDataUrl);
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
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Vision request failed (${res.status})`);
  const data = await res.json();
  return parseJson(data.content?.[0]?.text || '');
}

// Picks backend (no personal key) when signed in, else direct BYOK.
export async function extractBusinessCard(imageDataUrl, apiKey) {
  if (isLoggedIn()) return extractCardViaBackend(imageDataUrl);
  return extractDirect(imageDataUrl, apiKey);
}
