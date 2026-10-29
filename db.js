// SQLite database. Data lives in ayush.db (open with DB Browser for SQLite).
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(process.env.DB_FILE || path.join(__dirname, 'ayush.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS patients (
  health_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  masked_aadhaar TEXT,
  details TEXT,
  consultation_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  facility_type TEXT,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  registration_no TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS practitioners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  registration_no TEXT,
  council TEXT,
  qualification TEXT,
  facility_id TEXT,
  certificate_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin',          -- admin | auditor
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_id TEXT NOT NULL REFERENCES patients(health_id),
  document_type TEXT,
  file_name TEXT,
  system TEXT,
  problem TEXT,
  diagnosis TEXT,
  prakriti TEXT,
  medicines TEXT,                               -- JSON array
  advice TEXT,
  saved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
  upload_id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_id TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size INTEGER,
  uploaded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consents (
  health_id TEXT NOT NULL REFERENCES patients(health_id),
  doctor_id TEXT NOT NULL REFERENCES practitioners(id),
  granted_at TEXT NOT NULL,
  PRIMARY KEY (health_id, doctor_id)
);
CREATE TABLE IF NOT EXISTS ayurveda_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id TEXT NOT NULL,
  part TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,                           -- JSON
  saved_by TEXT,
  saved_at TEXT NOT NULL,
  UNIQUE (consultation_id, part, version)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  by_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  kind TEXT NOT NULL,
  target_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency (
  key TEXT NOT NULL,
  route TEXT NOT NULL,
  status INTEGER NOT NULL,
  response TEXT NOT NULL,
  PRIMARY KEY (key, route)
);
`);

module.exports = db;
