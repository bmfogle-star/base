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
`);

export default db;
