// Plan definitions and monthly usage tracking — protects you from runaway costs.
import db from './db.js';

export const PLANS = {
  premium:  { label: 'Premium',  maxClients: 20,       aiCallsPerMonth: 200 },
  platinum: { label: 'Platinum', maxClients: Infinity, aiCallsPerMonth: 2000 },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "2026-06"
}

export function getUsage(userId) {
  const month = currentMonth();
  const row = db.prepare('SELECT ai_calls FROM usage WHERE user_id = ? AND month = ?').get(userId, month);
  return { month, aiCalls: row?.ai_calls || 0 };
}

// Returns false if the user is over their plan's monthly AI limit.
export function canUseAI(user) {
  const plan = PLANS[user.plan] || PLANS.premium;
  const { aiCalls } = getUsage(user.id);
  return aiCalls < plan.aiCallsPerMonth;
}

export function incrementAI(userId) {
  const month = currentMonth();
  db.prepare(`
    INSERT INTO usage (user_id, month, ai_calls) VALUES (?, ?, 1)
    ON CONFLICT(user_id, month) DO UPDATE SET ai_calls = ai_calls + 1
  `).run(userId, month);
}
