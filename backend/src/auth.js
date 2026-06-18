// Auth helpers — password hashing, JWT issue/verify, and route middleware.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';
// Stay logged in for 90 days; refreshed on each use so active users never
// have to log in again (only after 90 days of inactivity).
const TOKEN_TTL = '90d';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: TOKEN_TTL });
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Express middleware: require a valid token, attach req.user.
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
