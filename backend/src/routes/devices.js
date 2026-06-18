// Device registry + per-plan device limit.
// A base (Free) account is capped at 4 devices; upgrading to Premium raises it.
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { PLANS } from '../usage.js';

const router = Router();

// Register (or refresh) the calling device. Blocks a NEW device once the
// account is at its plan's device limit.
router.post('/register', requireAuth, (req, res) => {
  const { deviceId, name } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

  const existing = db.prepare('SELECT * FROM devices WHERE user_id = ? AND device_id = ?').get(req.user.id, deviceId);
  if (existing) {
    db.prepare('UPDATE devices SET last_seen = ? WHERE user_id = ? AND device_id = ?')
      .run(new Date().toISOString(), req.user.id, deviceId);
    return res.json({ ok: true });
  }

  const count = db.prepare('SELECT COUNT(*) n FROM devices WHERE user_id = ?').get(req.user.id).n;
  const plan = PLANS[req.user.plan] || PLANS.premium;
  if (count >= plan.maxDevices) {
    const nextTier = req.user.plan === 'premium' ? 'Platinum' : 'Enterprise';
    return res.status(402).json({
      error: `Your ${plan.label} plan allows ${plan.maxDevices} devices. Upgrade to ${nextTier} for more.`,
      upgrade: true,
      maxDevices: plan.maxDevices,
    });
  }

  db.prepare('INSERT INTO devices (user_id, device_id, name, last_seen) VALUES (?, ?, ?, ?)')
    .run(req.user.id, deviceId, name || 'Device', new Date().toISOString());
  res.json({ ok: true, devices: count + 1 });
});

// List the account's devices (for a future "manage devices" screen).
router.get('/', requireAuth, (req, res) => {
  const devices = db.prepare('SELECT device_id, name, last_seen FROM devices WHERE user_id = ? ORDER BY last_seen DESC').all(req.user.id);
  res.json({ devices });
});

// Sign a device out (free up a slot).
router.delete('/:deviceId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM devices WHERE user_id = ? AND device_id = ?').run(req.user.id, req.params.deviceId);
  res.json({ ok: true });
});

export default router;
