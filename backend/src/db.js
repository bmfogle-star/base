// SQLite database — zero-setup, file-based. Swap for Postgres at scale.
import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_FILE || './spark.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                 TEXT PRIMARY KEY,
    email              TEXT UNIQUE NOT NULL,
    password_hash      TEXT NOT NULL,
    plan               TEXT NOT NULL DEFAULT 'premium',
    stripe_customer_id TEXT,
    created_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage (
    user_id   TEXT NOT NULL,
    month     TEXT NOT NULL,
    ai_calls  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, month)
  );

  -- Enterprise: organizations (tenants), memberships live on the users table.
  CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'enterprise',
    seats       INTEGER NOT NULL DEFAULT 5,
    owner_id    TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS org_settings (
    org_id            TEXT PRIMARY KEY,
    branding_json     TEXT NOT NULL DEFAULT '{}',
    custom_fields_json TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS invites (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    token       TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
`);

// Add org membership columns to users if they don't exist yet (simple migration).
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('org_id')) db.exec("ALTER TABLE users ADD COLUMN org_id TEXT");
if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT");

export default db;
