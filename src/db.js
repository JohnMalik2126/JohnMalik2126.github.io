const Database = require('better-sqlite3');
const config = require('./config');

const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  telegram_id INTEGER PRIMARY KEY,
  flow TEXT NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  awaiting_template INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  template_id TEXT NOT NULL,
  theme TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  content_json TEXT NOT NULL,
  event_at TEXT,
  status TEXT NOT NULL DEFAULT 'finalized',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cards_token ON cards(token);
`);

module.exports = db;
