// Enterprise: organizations, memberships, roles, invites, seats.
// Scaffold — covers Phase 1 (org foundation). See ENTERPRISE.md.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const ROLE_RANK = { member: 0, admin: 1, owner: 2 };

// Enterprise pricing: flat $500/mo up to 50 seats, $1,000/mo for 51+.
export function enterpriseMonthlyPrice(seats) {
  return seats > 50 ? 1000 : 500;
}

function memberCount(orgId) {
  return db.prepare('SELECT COUNT(*) n FROM users WHERE org_id = ?').get(orgId).n;
}

// Require the caller to belong to an org with at least the given role.
function requireRole(minRole) {
  return (req, res, next) => {
    const { org_id, role } = req.user;
    if (!org_id) return res.status(403).json({ error: 'Not part of an organization' });
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// Create an organization; the creator becomes its owner.
router.post('/', requireAuth, (req, res) => {
  if (req.user.org_id) return res.status(409).json({ error: 'You already belong to an organization' });
  const { name, seats } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Organization name required' });

  const org = { id: randomUUID(), name: name.trim(), plan: 'enterprise', seats: seats || 5, owner_id: req.user.id, created_at: new Date().toISOString() };
  db.prepare('INSERT INTO organizations (id, name, plan, seats, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(org.id, org.name, org.plan, org.seats, org.owner_id, org.created_at);
  db.prepare('INSERT INTO org_settings (org_id) VALUES (?)').run(org.id);
  db.prepare('UPDATE users SET org_id = ?, role = ?, plan = ? WHERE id = ?').run(org.id, 'owner', 'enterprise', req.user.id);

  res.json({ org, role: 'owner' });
});

// Org overview: details, members, settings.
router.get('/me', requireAuth, requireRole('member'), (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.org_id);
  const members = db.prepare('SELECT id, email, role FROM users WHERE org_id = ?').all(req.user.org_id);
  const settingsRow = db.prepare('SELECT * FROM org_settings WHERE org_id = ?').get(req.user.org_id) || {};
  res.json({
    org,
    members,
    seatsUsed: members.length,
    settings: {
      branding: JSON.parse(settingsRow.branding_json || '{}'),
      customFields: JSON.parse(settingsRow.custom_fields_json || '[]'),
    },
  });
});

// Invite a member (returns a link; a real deployment also emails it).
router.post('/invite', requireAuth, requireRole('admin'), (req, res) => {
  const { email, role } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (memberCount(req.user.org_id) >= db.prepare('SELECT seats FROM organizations WHERE id = ?').get(req.user.org_id).seats) {
    return res.status(409).json({ error: 'No seats available. Add seats first.' });
  }
  const invite = { id: randomUUID(), org_id: req.user.org_id, email: email.toLowerCase(), role: role === 'admin' ? 'admin' : 'member', token: randomUUID(), created_at: new Date().toISOString() };
  db.prepare('INSERT INTO invites (id, org_id, email, role, token, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(invite.id, invite.org_id, invite.email, invite.role, invite.token, invite.created_at);
  res.json({ inviteLink: `${process.env.APP_URL || ''}?invite=${invite.token}` });
});

// Accept an invite and join the org.
router.post('/accept', requireAuth, (req, res) => {
  if (req.user.org_id) return res.status(409).json({ error: 'You already belong to an organization' });
  const { token } = req.body || {};
  const invite = db.prepare('SELECT * FROM invites WHERE token = ?').get(token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
  if (memberCount(invite.org_id) >= db.prepare('SELECT seats FROM organizations WHERE id = ?').get(invite.org_id).seats) {
    return res.status(409).json({ error: 'Organization is at seat capacity' });
  }
  db.prepare('UPDATE users SET org_id = ?, role = ?, plan = ? WHERE id = ?').run(invite.org_id, invite.role, 'enterprise', req.user.id);
  db.prepare('DELETE FROM invites WHERE id = ?').run(invite.id);
  res.json({ ok: true, org_id: invite.org_id, role: invite.role });
});

// Update branding + custom fields.
router.patch('/settings', requireAuth, requireRole('admin'), (req, res) => {
  const { branding, customFields } = req.body || {};
  if (branding !== undefined) db.prepare('UPDATE org_settings SET branding_json = ? WHERE org_id = ?').run(JSON.stringify(branding), req.user.org_id);
  if (customFields !== undefined) db.prepare('UPDATE org_settings SET custom_fields_json = ? WHERE org_id = ?').run(JSON.stringify(customFields), req.user.org_id);
  res.json({ ok: true });
});

// Change seat count (owner only). In production this also updates the Stripe
// subscription quantity.
router.patch('/seats', requireAuth, requireRole('owner'), (req, res) => {
  const { seats } = req.body || {};
  if (!Number.isInteger(seats) || seats < 1) return res.status(400).json({ error: 'Invalid seat count' });
  if (seats < memberCount(req.user.org_id)) return res.status(409).json({ error: 'Cannot set seats below current member count' });
  db.prepare('UPDATE organizations SET seats = ? WHERE id = ?').run(seats, req.user.org_id);
  res.json({ ok: true, seats, monthlyPrice: enterpriseMonthlyPrice(seats) });
});

// Change a member's role.
router.post('/members/:id/role', requireAuth, requireRole('admin'), (req, res) => {
  const { role } = req.body || {};
  if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Role must be member or admin' });
  const target = db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(req.params.id, req.user.org_id);
  if (!target) return res.status(404).json({ error: 'Member not found' });
  if (target.role === 'owner') return res.status(403).json({ error: "Can't change the owner's role" });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, target.id);
  res.json({ ok: true });
});

export default router;
