var Database = require('better-sqlite3');
var path = require('path');
var fs = require('fs');

var DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

var DB_PATH = path.join(DB_DIR, 'medical.db');

var db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    phone TEXT UNIQUE,
    wechat_openid TEXT UNIQUE,
    nickname TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    hospital TEXT DEFAULT '',
    department TEXT DEFAULT '',
    doctor TEXT DEFAULT '',
    complaint TEXT DEFAULT '',
    diagnosis TEXT DEFAULT '',
    medication TEXT DEFAULT '',
    examination TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS record_images (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES medical_records(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_user ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_updated ON medical_records(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_records_deleted ON medical_records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
`);

module.exports = db;
