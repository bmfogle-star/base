// Synced calendar events. Same scoping as clients: org-shared for enterprise,
// personal otherwise. Audience (everyone / specific people) lives in the event
// data and is filtered client-side for display.
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function scope(user) {
  if (user.org_id) return { where: 'org_id = ?', params: [user.org_id] };
  return { where: 'owner_id = ? AND org_id IS NULL', params: [user.id] };
}

router.get('/', requireAuth, (req, res) => {
  const { where, params } = scope(req.user);
  const since = req.query.since;
  let sql = `SELECT id, data_json, updated_at, deleted FROM events WHERE ${where}`;
  const args = [...params];
  if (since) { sql += ' AND updated_at > ?'; args.push(since); }
  const rows = db.prepare(sql).all(...args);
  res.json({
    events: rows.map(r => ({ id: r.id, deleted: !!r.deleted, data: r.deleted ? null : JSON.parse(r.data_json), updatedAt: r.updated_at })),
    serverTime: new Date().toISOString(),
  });
});

router.put('/:id', requireAuth, (req, res) => {
  const { data, updatedAt } = req.body || {};
  if (!data) return res.status(400).json({ error: 'data is required' });
  const ts = updatedAt || new Date().toISOString();
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (existing) {
    const inScope = req.user.org_id ? existing.org_id === req.user.org_id : existing.owner_id === req.user.id;
    if (!inScope) return res.status(403).json({ error: 'Not allowed' });
    if (new Date(ts) < new Date(existing.updated_at)) return res.json({ ok: true, skipped: 'stale' });
    db.prepare('UPDATE events SET data_json = ?, updated_at = ?, deleted = 0 WHERE id = ?').run(JSON.stringify(data), ts, req.params.id);
  } else {
    db.prepare('INSERT INTO events (id, owner_id, org_id, data_json, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)')
      .run(req.params.id, req.user.id, req.user.org_id || null, JSON.stringify(data), ts);
  }
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.json({ ok: true });
  const inScope = req.user.org_id ? existing.org_id === req.user.org_id : existing.owner_id === req.user.id;
  if (!inScope) return res.status(403).json({ error: 'Not allowed' });
  db.prepare('UPDATE events SET deleted = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});

export default router;
