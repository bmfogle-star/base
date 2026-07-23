// The AI Position Coach.
//
// A coach configures it once (team philosophy, terminology, and notes per
// position) and supplies an Anthropic API key. Players then ask it questions
// about their assignments and "what-if" situations, and it answers as "Coach",
// grounded in the team's actual playbook. Bring-your-own-key: the request goes
// straight from the player's browser to the Anthropic API.

import Anthropic from '@anthropic-ai/sdk';

const AI_KEY = 'pb_ai_settings';        // { apiKey, model }
const KNOWLEDGE_KEY = 'pb_ai_knowledge'; // { philosophy, terminology, positions: {pos: text} }

// A capable default. Coaches can switch to a cheaper/faster model in Settings.
export const MODELS = [
  { id: 'claude-opus-4-8', label: 'Best (Opus 4.8)', note: 'Smartest answers' },
  { id: 'claude-sonnet-5', label: 'Balanced (Sonnet 5)', note: 'Fast & strong' },
  { id: 'claude-haiku-4-5', label: 'Cheapest (Haiku 4.5)', note: 'Fastest, lowest cost' },
];
export const DEFAULT_MODEL = 'claude-opus-4-8';

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function getAISettings() {
  return read(AI_KEY, { apiKey: '', model: DEFAULT_MODEL });
}
export function saveAISettings(s) {
  localStorage.setItem(AI_KEY, JSON.stringify(s));
  return s;
}

export function getKnowledge() {
  return read(KNOWLEDGE_KEY, { philosophy: '', terminology: '', positions: {} });
}
export function saveKnowledge(k) {
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(k));
  return k;
}

export function isCoachConfigured() {
  return !!getAISettings().apiKey;
}

// Compact the playbook into text the model can reason over. Kept small on
// purpose — a high-school playbook fits comfortably.
function playbookContext(plays) {
  return plays.map(p => {
    const head = `PLAY: ${p.name} [${p.category}]${p.formation ? ` — ${p.formation}` : ''}${p.personnel ? ` (${p.personnel})` : ''}`;
    const assigns = (p.positions || [])
      .map(x => `  - ${x.pos}${x.label ? ` (${x.label})` : ''}: ${x.assignment}`)
      .join('\n');
    const notes = p.notes ? `  Notes: ${p.notes}` : '';
    const tags = p.tags?.length ? `  Tags: ${p.tags.join(', ')}` : '';
    return [head, assigns, notes, tags].filter(Boolean).join('\n');
  }).join('\n\n');
}

function buildSystemPrompt({ plays, knowledge, position }) {
  const k = knowledge || {};
  return [
    "You are \"Coach\", an assistant inside a football playbook app used by high school players.",
    "Your job is to help a young athlete truly understand the team's playbook and their assignments.",
    "",
    "How to talk:",
    "- Talk like a patient position coach to a teenager. Simple, clear, encouraging.",
    "- Keep answers short and concrete. Lead with the answer, then a quick why.",
    "- Assume they may not know jargon — briefly define any football term you use.",
    "- Walk through 'what-if' situations (coverages, fronts, motions) step by step.",
    "",
    "Ground rules:",
    "- Only teach assignments and plays from THIS team's playbook below. Do not invent plays, routes, or rules that aren't there.",
    "- If the answer isn't in the playbook or the coach's notes, say so plainly and tell them to ask their coach — don't guess.",
    "- Use the team's own terminology when it's provided.",
    position ? `- This player's position is: ${position}. When relevant, focus on that position's job.` : "",
    "",
    k.philosophy ? `TEAM PHILOSOPHY (from the coach):\n${k.philosophy}` : "",
    k.terminology ? `\nTERMINOLOGY / CALLS (from the coach):\n${k.terminology}` : "",
    position && k.positions?.[position] ? `\nCOACH'S NOTES FOR ${position}:\n${k.positions[position]}` : "",
    "",
    "THE PLAYBOOK:",
    plays?.length ? playbookContext(plays) : "(No plays have been added yet.)",
  ].filter(Boolean).join('\n');
}

// Stream an answer. Calls onDelta(textChunk) as text arrives; resolves with the
// full text. `history` is [{ role:'user'|'assistant', text }].
export async function askCoach({ question, plays, knowledge, position, history = [], onDelta }) {
  const { apiKey, model } = getAISettings();
  if (!apiKey) throw new Error('No API key set. A coach needs to set this up in Settings.');

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: question },
  ];

  let full = '';
  const stream = client.messages.stream({
    model: model || DEFAULT_MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt({ plays, knowledge, position }),
    messages,
  });
  stream.on('text', (delta) => {
    full += delta;
    onDelta?.(delta);
  });
  await stream.finalMessage();
  return full;
}
