// Register / login / me.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { hashPassword, verifyPassword, issueToken, requireAuth } from '../auth.js';
import { getUsage, PLANS } from '../usage.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    password_hash: await hashPassword(password),
    plan: 'free',
    created_at: new Date().toISOString(),
  };
  db.prepare('INSERT INTO users (id, email, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, user.email, user.password_hash, user.plan, user.created_at);

  res.json({ token: issueToken(user), user: { email: user.email, plan: user.plan } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: issueToken(user), user: { email: user.email, plan: user.plan } });
});

router.get('/me', requireAuth, (req, res) => {
  const usage = getUsage(req.user.id);
  const plan = PLANS[req.user.plan] || PLANS.premium;
  res.json({
    email: req.user.email,
    plan: req.user.plan,
    org_id: req.user.org_id || null,
    role: req.user.role || null,
    limits: { aiCallsPerMonth: plan.aiCallsPerMonth, maxClients: plan.maxClients },
    usage,
  });
});

export default router;
