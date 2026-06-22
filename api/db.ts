import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'asset_management.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('model', 'texture', 'other')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'warning')),
      tags_json TEXT DEFAULT '[]',
      thumbnail TEXT DEFAULT '',
      current_version_id TEXT,
      uploader_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS asset_versions (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      remark TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_by_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (created_by_id) REFERENCES users(id),
      UNIQUE (asset_id, version)
    );

    CREATE TABLE IF NOT EXISTS asset_locks (
      asset_id TEXT PRIMARY KEY,
      locked_by_id TEXT NOT NULL,
      locked_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (locked_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS archive_records (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      remark TEXT DEFAULT '',
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_assets_uploader ON assets(uploader_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
    CREATE INDEX IF NOT EXISTS idx_versions_asset ON asset_versions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_versions_created_by ON asset_versions(created_by_id);
  `);
}

function seedUsers() {
  const users = [
    {
      id: 'user_admin_001',
      username: 'admin',
      password: 'admin123',
      displayName: '系统管理员',
      role: 'admin',
      avatar: '👑',
    },
    {
      id: 'user_editor_001',
      username: 'editor',
      password: 'editor123',
      displayName: '设计师小王',
      role: 'editor',
      avatar: '🎨',
    },
    {
      id: 'user_viewer_001',
      username: 'viewer',
      password: 'viewer123',
      displayName: '只读用户小李',
      role: 'viewer',
      avatar: '👁️',
    },
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password_hash, display_name, avatar, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`
  );

  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    insert.run(u.id, u.username, hash, u.displayName, u.avatar, u.role);
  }
}

initSchema();
seedUsers();

console.log('[DB] Database initialized at', DB_PATH);

export default db;
