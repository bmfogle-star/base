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
    join_code   TEXT,
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

  -- Synced client records. Scoped to an org (shared) or a personal owner.
  CREATE TABLE IF NOT EXISTS clients (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT,
    org_id      TEXT,
    data_json   TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_clients_scope ON clients (org_id, owner_id, updated_at);

  -- Calendar events. Org-scoped (shared) or personal, like clients.
  CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT,
    org_id      TEXT,
    data_json   TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_events_scope ON events (org_id, owner_id, updated_at);

  -- Devices signed into an account (for the per-plan device limit).
  CREATE TABLE IF NOT EXISTS devices (
    user_id    TEXT NOT NULL,
    device_id  TEXT NOT NULL,
    name       TEXT,
    last_seen  TEXT NOT NULL,
    PRIMARY KEY (user_id, device_id)
  );
`);

// Add org membership columns to users if they don't exist yet (simple migration).
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('org_id')) db.exec("ALTER TABLE users ADD COLUMN org_id TEXT");
if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT");

const orgCols = db.prepare("PRAGMA table_info(organizations)").all().map(c => c.name);
if (orgCols.length && !orgCols.includes('join_code')) db.exec("ALTER TABLE organizations ADD COLUMN join_code TEXT");

export default db;
