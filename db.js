// db.js - Persistent SQLite database management for LittleSteps using node:sqlite
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'littlesteps.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      consent_given INTEGER DEFAULT 1,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      age INTEGER NOT NULL,
      daily_screen_time_minutes INTEGER DEFAULT 45,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reward_status (
      parent_id TEXT PRIMARY KEY,
      consecutive_streak INTEGER DEFAULT 0,
      last_claim_date_ist TEXT DEFAULT '',
      total_stars INTEGER DEFAULT 0,
      badges_json TEXT DEFAULT '[]',
      certificates_json TEXT DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reward_claims (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      claim_date_ist TEXT NOT NULL,
      streak_day INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_name TEXT NOT NULL,
      stars_awarded INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nutrition_logs (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      meal_date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      foods_offered_json TEXT NOT NULL,
      foods_eaten_json TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      glasses_count INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      stars_earned INTEGER DEFAULT 1,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS data_deletion_requests (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT,
      details TEXT,
      status TEXT DEFAULT 'completed',
      requested_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_id);
    CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_child_date ON nutrition_logs(child_id, meal_date);
    CREATE INDEX IF NOT EXISTS idx_water_child_date ON water_logs(child_id, log_date);
    CREATE INDEX IF NOT EXISTS idx_learning_child ON learning_progress(child_id);
    CREATE INDEX IF NOT EXISTS idx_claims_parent ON reward_claims(parent_id, claim_date_ist);
  `);

  // Migration for daily_screen_time_minutes if column missing
  try {
    const cols = db.prepare('PRAGMA table_info(children)').all();
    if (!cols.some(c => c.name === 'daily_screen_time_minutes')) {
      db.exec('ALTER TABLE children ADD COLUMN daily_screen_time_minutes INTEGER DEFAULT 45;');
    }
  } catch (err) {
    console.warn('Migration note:', err.message);
  }
}

initSchema();

module.exports = {
  db,
  initSchema
};
