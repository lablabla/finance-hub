CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  type        TEXT NOT NULL,
  format      TEXT,
  url         TEXT,
  notes       TEXT,
  frequency   TEXT NOT NULL DEFAULT 'monthly',
  active      INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  source_id   TEXT REFERENCES sources(id),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  currency    TEXT DEFAULT 'ILS',
  balance     REAL,
  balance_usd REAL,
  fx_rate     REAL,
  as_of       TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  account_id      TEXT REFERENCES accounts(id),
  date            TEXT NOT NULL,
  processed_date  TEXT,
  description     TEXT,
  category        TEXT,
  amount          REAL NOT NULL,
  currency        TEXT DEFAULT 'ILS',
  amount_ils      REAL,
  status          TEXT DEFAULT 'completed',
  source_file     TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  total_ils   REAL,
  total_usd   REAL,
  breakdown   TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS checklist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  source_id   TEXT REFERENCES sources(id),
  checked     INTEGER DEFAULT 0,
  checked_at  TEXT,
  notes       TEXT,
  UNIQUE(year, month, source_id)
);

CREATE TABLE IF NOT EXISTS insights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  content     TEXT NOT NULL,
  model       TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS uploads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id   TEXT REFERENCES sources(id),
  filename    TEXT,
  parsed_ok   INTEGER,
  records     INTEGER,
  error       TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS validation_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type   TEXT NOT NULL,
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  raw_text      TEXT,
  institutions  TEXT,
  uploaded_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(report_type, year, month)
);

CREATE TABLE IF NOT EXISTS source_alerts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id          INTEGER REFERENCES validation_reports(id),
  institution        TEXT NOT NULL,
  product_type       TEXT,
  dismissed          INTEGER DEFAULT 0,
  dismissed_at       TEXT,
  resolved           INTEGER DEFAULT 0,
  resolved_source_id TEXT REFERENCES sources(id),
  created_at         TEXT DEFAULT (datetime('now'))
);
