// AI pre-call cheat sheet from a client's profile + recent calls.
import { isLoggedIn, talkingPointsViaBackend } from './api';

// Build a compact profile string for the AI from a client record.
export function compileProfile(client) {
  const parts = [];
  if (client.name) parts.push(`Name: ${client.name}`);
  if (client.company) parts.push(`Company: ${client.company}`);
  if (client.position) parts.push(`Title: ${client.position}`);
  if (client.birthday) parts.push(`Birthday: ${client.birthday}`);
  if (client.hobbies?.length) parts.push(`Hobbies: ${client.hobbies.join(', ')}`);
  if (client.family?.length) parts.push(`Family: ${client.family.map(f => `${f.name} (${f.relation})`).join(', ')}`);
  if (client.upcomingEvents?.length) parts.push(`Upcoming events: ${client.upcomingEvents.map(e => `${e.title}${e.date ? ` (${e.date})` : ''}`).join(', ')}`);
  if (client.notes) parts.push(`Notes: ${client.notes}`);
  const recent = [...(client.callHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  recent.forEach((c, i) => {
    if (c.extracted || c.summary) parts.push(`Call ${i + 1} (${new Date(c.date).toLocaleDateString()}): ${c.extracted || c.summary}`);
  });
  return parts.join('\n');
}

async function direct(profile, apiKey) {
  if (!apiKey) throw new Error('Add your Claude API key in Settings (or sign in) for talking points.');
  const p = `You are prepping a salesperson before they contact this client. From the profile below, write a short, scannable cheat sheet of rapport-building talking points and reminders (personal details to mention, follow-ups from last call, things to ask about). Use 4-7 short bullet points starting with "- ". Be specific; only use what's in the profile.\n\nProfile:\n${profile}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: p }] }),
  });
  if (!res.ok) throw new Error(`Talking points failed (${res.status})`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export async function generateTalkingPoints(client, apiKey) {
  const profile = compileProfile(client);
  if (isLoggedIn()) return talkingPointsViaBackend(profile);
  return direct(profile, apiKey);
}
