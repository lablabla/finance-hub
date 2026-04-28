# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Finance Hub — Project Context for Claude Code

This file is the single source of truth for the project. Read it fully before making any changes.

---

## What This Is

A self-hosted personal finance dashboard running on a **Raspberry Pi 5 with OMV7 (OpenMediaVault)**. It aggregates financial data from multiple Israeli and US sources, displays a unified net worth dashboard, and uses AI to extract data from uploaded documents and generate monthly insights.

This is a **single-user personal system** — not a multi-tenant app. Security priorities: keep credentials off the internet, never expose the Pi publicly.

---

## Hardware & Infrastructure

| Component | Detail |
|---|---|
| Server | Raspberry Pi 5 (ARM64, 4-core Cortex-A76) |
| OS | Raspberry Pi OS Lite (Debian 12) |
| NAS layer | OpenMediaVault 7 (OMV7) |
| Containers | Docker Compose via OMV7 omv-extras plugin |
| Local access | LAN only via Nginx reverse proxy |
| Remote access | Tailscale (zero port exposure) |
| Architecture | ARM64 — all Docker images must support linux/arm64 |

---

## Data Sources

### Automatic (API)

| Source | Type | Method | Notes |
|---|---|---|---|
| E*TRADE | US Stocks | Official REST API + OAuth 2.0 | Register at developer.etrade.com. Individual key works with own account only. Requires annual developer agreement renewal. Endpoints: `/v1/accounts/{id}/portfolio`, balances, transactions. |

### Manual Monthly Export (CSV / PDF upload)

These sources have no public API. User downloads reports monthly and uploads to the dashboard.

| Source | Type | Format | Portal |
|---|---|---|---|
| Otzar HaHayal | Bank account | CSV | otsarhahayal.co.il |
| Visa Cal | Credit card | CSV | cal-online.co.il |
| Harel – Pension | Pension fund | PDF | harel-group.co.il |
| Harel – Keren Hishtalmut | Study fund | PDF | harel-group.co.il |
| Excellence Investments | Investment portfolio | PDF / CSV | excellence.co.il (now under Phoenix Holdings) |

> **Note:** Scraping was explicitly removed from scope. All Israeli bank/credit card/pension data comes via manual export only. Do not add scraping logic.

### Government Validation Services (Source Discovery Layer)

These are Israeli government services used to **validate completeness** — i.e. to check that no financial accounts or insurance policies have been missed. They are NOT primary data sources; they are uploaded once a month alongside regular exports and compared against the configured source list.

| Service | What it covers | Portal | Update frequency |
|---|---|---|---|
| **הר הביטוח** (Har HaBituach) | All active insurance policies across every insurer in Israel — health, life, home, car, personal accidents | harb.cma.gov.il | Monthly |
| **המסלקה הפנסיונית** (Pension Clearinghouse) | All pension funds, Keren Hishtalmut, Keren Gemel, Bituach Menahalim across every registered institutional body | swiftness.co.il | On-demand (register as individual, ~₪1/month subscription) |
| **הר הכסף** (Har HaKesef) | Dormant/forgotten bank savings accounts and deposits | harkeseff.cma.gov.il | One-time check + annual |

**Important notes:**
- Har HaBituach does **not** include Bituach Menahalim — that appears in the Pension Clearinghouse only.
- The Pension Clearinghouse requires one-time individual registration at swiftness.co.il. Individuals can register directly (same reports pension agents pull). A low-cost subscription (~₪1/month) gives ongoing access.
- Neither service has a public API accessible to individual developers. Both are upload-and-parse only.
- Har HaKesef is a one-time discovery tool, not a recurring monthly source.

**How they integrate into the dashboard:**

When a Har HaBituach or Pension Clearinghouse PDF is uploaded, the AI extractor parses the list of institutions and products found. The backend then runs a **source validation check**: it compares the institutions listed in the government report against the configured sources in the database. Any institution found in the report that does not have a matching source in the DB triggers a **"missing source" alert** in the dashboard, prompting the user to add it.

This validation logic lives in `backend/src/parsers/validation.js`.

### Source Management

Users can add and remove sources from within the dashboard UI. Sources are stored in the SQLite database, not hardcoded. The monthly checklist reflects the current source list dynamically.

---

## Technology Stack

| Role | Technology | Notes |
|---|---|---|
| Backend | Node.js + Express.js | Single service handling API, scheduling, file watching |
| Database | SQLite via `better-sqlite3` | Single file, zero config, easy backup |
| Scheduler | `node-cron` | Runs E*TRADE API poll on schedule |
| PDF parsing | `pdf-parse` + Claude API | Structured fields via library; unstructured PDFs sent to Claude for extraction |
| CSV parsing | `csv-parser` | For bank and credit card exports |
| Frontend | React + Recharts | Static build served by Nginx |
| AI insights | Anthropic Claude API (`claude-sonnet-4-6`) | PDF data extraction + monthly narrative insights |
| Reverse proxy | Nginx | Serves frontend, proxies `/api` to Express |
| Containerisation | Docker Compose | All services in containers |
| Remote access | Tailscale | Optional, user-configured |
| Reminders | `node-cron` + nodemailer or Telegram bot webhook | Monthly reminder to download manual exports |

---

## Folder Structure

```
finance-hub/
├── CLAUDE.md                  ← this file
├── README.md
├── .gitignore                 ← node_modules, .env, *.sqlite, uploads/, data/raw/
├── docker-compose.yml         ← all services
├── .env.example               ← template, never commit .env
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js           ← Express app entry point
│   │   ├── db/
│   │   │   ├── schema.sql     ← SQLite schema definition
│   │   │   └── db.js          ← better-sqlite3 connection + helpers
│   │   ├── routes/
│   │   │   ├── accounts.js    ← GET /api/accounts
│   │   │   ├── transactions.js← GET /api/transactions
│   │   │   ├── snapshots.js   ← GET /api/snapshots (net worth history)
│   │   │   ├── sources.js     ← CRUD /api/sources
│   │   │   ├── checklist.js   ← GET/POST /api/checklist/:year/:month
│   │   │   ├── upload.js      ← POST /api/upload
│   │   │   └── insights.js    ← GET/POST /api/insights
│   │   ├── collectors/
│   │   │   ├── etrade.js      ← E*TRADE OAuth + REST polling
│   │   │   └── scheduler.js   ← node-cron jobs
│   │   ├── parsers/
│   │   │   ├── csv.js         ← Generic CSV parser + per-source mappers
│   │   │   ├── pdf.js         ← pdf-parse text extraction
│   │   │   ├── ai-extractor.js← Claude API call for unstructured PDF data
│   │   │   └── validation.js  ← Compares gov report institutions vs configured sources → missing source alerts
│   │   ├── normalizer.js      ← Maps all source formats → unified schema
│   │   └── insights.js        ← Monthly AI insight generation via Claude API
│   └── data/                  ← gitignored: finance.sqlite, uploads/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── Dashboard/
│       │   │   ├── NetWorthCard.jsx
│       │   │   ├── NetWorthChart.jsx
│       │   │   ├── AssetBreakdown.jsx
│       │   │   ├── SpendingChart.jsx
│       │   │   └── RecentTransactions.jsx
│       │   ├── Checklist/
│       │   │   ├── MonthlyChecklist.jsx  ← already designed, port from HTML prototype
│       │   │   ├── SourceItem.jsx
│       │   │   └── AddSourceForm.jsx
│       │   ├── Upload/
│       │   │   ├── UploadZone.jsx
│       │   │   └── ParseResult.jsx
│       │   ├── Validation/
│       │   │   ├── ValidationUpload.jsx   ← upload zone specifically for gov PDFs
│       │   │   ├── AlertsList.jsx         ← list of missing-source alerts with resolve/dismiss
│       │   │   └── AlertItem.jsx
│       │   ├── Insights/
│       │   │   └── InsightPanel.jsx
│       │   └── shared/
│       │       ├── Sidebar.jsx
│       │       ├── Toast.jsx
│       │       └── Dialog.jsx
│       └── api/
│           └── client.js      ← fetch wrapper for all backend calls
│
└── nginx/
    └── nginx.conf             ← serves frontend, proxies /api to backend:3001
```

---

## Database Schema

```sql
-- Sources: user-configurable list of financial data sources
CREATE TABLE sources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,  -- bank | credit | pension | invest | insurance | other
  type        TEXT NOT NULL,  -- api | manual
  format      TEXT,           -- CSV | PDF | Excel | API
  url         TEXT,           -- portal URL for manual sources
  notes       TEXT,
  active      INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Accounts: one row per financial account
CREATE TABLE accounts (
  id          TEXT PRIMARY KEY,
  source_id   TEXT REFERENCES sources(id),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- checking | savings | credit | pension | investment | study_fund
  currency    TEXT DEFAULT 'ILS',
  balance     REAL,
  balance_usd REAL,           -- converted at fetch time
  fx_rate     REAL,           -- ILS/USD rate at fetch time
  as_of       TEXT,           -- ISO date of the balance
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Transactions: normalized across all sources
CREATE TABLE transactions (
  id              TEXT PRIMARY KEY,
  account_id      TEXT REFERENCES accounts(id),
  date            TEXT NOT NULL,   -- ISO date
  processed_date  TEXT,
  description     TEXT,
  category        TEXT,
  amount          REAL NOT NULL,   -- negative = debit, positive = credit
  currency        TEXT DEFAULT 'ILS',
  amount_ils      REAL,            -- always in ILS
  status          TEXT DEFAULT 'completed',  -- completed | pending
  source_file     TEXT,            -- original filename if from upload
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Net worth snapshots: daily rollup for charting
CREATE TABLE snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,       -- ISO date (one per day)
  total_ils   REAL,
  total_usd   REAL,
  breakdown   TEXT,                -- JSON: { bank, credit, pension, invest, ... }
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(date)
);

-- Monthly checklist state
CREATE TABLE checklist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,    -- 0-indexed (Jan=0)
  source_id   TEXT REFERENCES sources(id),
  checked     INTEGER DEFAULT 0,
  checked_at  TEXT,
  notes       TEXT,
  UNIQUE(year, month, source_id)
);

-- AI-generated monthly insights
CREATE TABLE insights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  content     TEXT NOT NULL,       -- markdown text from Claude
  model       TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(year, month)
);

-- Upload log
CREATE TABLE uploads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id   TEXT REFERENCES sources(id),
  filename    TEXT,
  parsed_ok   INTEGER,
  records     INTEGER,             -- number of transactions/snapshots extracted
  error       TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- Government validation reports (Har HaBituach, Pension Clearinghouse)
CREATE TABLE validation_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type   TEXT NOT NULL,  -- har_habituach | pension_clearinghouse | har_hakesef
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  raw_text      TEXT,           -- extracted PDF text, kept for re-parsing
  institutions  TEXT,           -- JSON array of institution names found in report
  uploaded_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(report_type, year, month)
);

-- Missing source alerts generated from validation reports
CREATE TABLE source_alerts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id       INTEGER REFERENCES validation_reports(id),
  institution     TEXT NOT NULL,   -- institution name as it appears in the gov report
  product_type    TEXT,            -- pension | insurance | investment | study_fund etc.
  dismissed       INTEGER DEFAULT 0,
  dismissed_at    TEXT,
  resolved        INTEGER DEFAULT 0, -- set to 1 when user adds the source
  resolved_source_id TEXT REFERENCES sources(id),
  created_at      TEXT DEFAULT (datetime('now'))
);
```

---

## Unified Data Schema (normalizer output)

All parsers must output data in this shape before writing to SQLite:

```js
// Account
{
  id: string,           // "{sourceId}-{accountNumber}"
  source_id: string,
  name: string,
  type: string,         // checking | savings | credit | pension | investment | study_fund
  currency: string,
  balance: number,
  balance_usd: number,
  fx_rate: number,
  as_of: string         // ISO date
}

// Transaction
{
  id: string,           // "{accountId}-{date}-{description}-{amount}" hashed
  account_id: string,
  date: string,         // ISO date
  processed_date: string,
  description: string,
  category: string,
  amount: number,       // negative = debit
  currency: string,
  amount_ils: number,
  status: string        // completed | pending
}
```

---

## API Endpoints

```
GET    /api/accounts                    → all accounts with latest balances
GET    /api/transactions?account=&from=&to=&category=  → filtered transactions
GET    /api/snapshots?from=&to=         → net worth history for charting
GET    /api/sources                     → all configured sources
POST   /api/sources                     → add source
DELETE /api/sources/:id                 → remove source
GET    /api/checklist/:year/:month      → checklist state for month
POST   /api/checklist/:year/:month      → update check state for a source
POST   /api/upload                      → multipart upload of CSV/PDF (regular sources)
POST   /api/validate/upload             → multipart upload of gov validation PDF (Har HaBituach / Pension Clearinghouse)
GET    /api/validate/alerts             → list of unresolved missing-source alerts
POST   /api/validate/alerts/:id/dismiss → dismiss an alert (not relevant to user)
POST   /api/validate/alerts/:id/resolve → mark alert resolved, link to source_id
GET    /api/insights/:year/:month       → get stored insight
POST   /api/insights/:year/:month       → trigger AI insight generation
GET    /api/health                      → { ok: true, db: true, etrade: bool }
```

---

## Environment Variables (.env.example)

```env
# Server
PORT=3001
NODE_ENV=production

# Database
DB_PATH=/data/finance.sqlite

# E*TRADE API
ETRADE_CONSUMER_KEY=
ETRADE_CONSUMER_SECRET=
ETRADE_BASE_URL=https://api.etrade.com

# Anthropic (Claude API)
ANTHROPIC_API_KEY=

# FX rate source (optional — for ILS/USD conversion)
# Uses exchangerate-api.com free tier or similar
FX_API_KEY=

# Reminders
# Option A: Email
REMINDER_EMAIL_FROM=
REMINDER_EMAIL_TO=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Option B: Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Tailscale (no config needed here — handled at OS level)
```

---

## Docker Compose Services

```yaml
services:
  backend:
    build: ./backend
    restart: unless-stopped
    volumes:
      - ./backend/data:/data        # sqlite db + uploads
    env_file: .env
    ports:
      - "3001:3001"                 # internal only, nginx proxies

  frontend:
    build: ./frontend
    restart: unless-stopped
    # static build served by nginx — no runtime needed

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"                     # LAN access
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - backend
```

---

## What Is Already Built

### `src/frontend/monthly-checklist.html`
A standalone HTML prototype of the monthly collection checklist. Fully functional with:
- Sidebar with month-by-month navigation and completion badges
- Progress ring showing % of sources collected for current month
- Separate sections for API (auto) vs manual sources
- Per-source check-off with date stamp
- Add / remove sources dynamically
- Month notes textarea
- All state persisted in `localStorage`

**This needs to be ported into React as `frontend/src/components/Checklist/MonthlyChecklist.jsx`**, replacing localStorage with backend API calls to `/api/checklist/:year/:month` and `/api/sources`.

Pre-loaded sources in prototype (match these when seeding the DB):
- API: E*TRADE
- Manual: Otzar HaHayal, Visa Cal, Harel Pension, Harel Keren Hishtalmut, Excellence Investments
- Validation: Har HaBituach (monthly), Pension Clearinghouse (monthly), Har HaKesef (annual)

The checklist must show validation sources in a **third section** (below API and Manual), labelled "🏛️ Government Validation". Har HaKesef should be marked as annual frequency, not monthly.

---

## Build Phases

### Phase 1 — Foundation (current focus)
- [ ] Repo structure and Docker Compose scaffold
- [ ] SQLite schema + db.js connection module
- [ ] Express app with health endpoint
- [ ] Sources CRUD endpoints + seed data
- [ ] Checklist API endpoints
- [ ] E*TRADE OAuth flow + portfolio fetch
- [ ] Scheduler for E*TRADE polling

### Phase 2 — Upload Pipeline
- [ ] File upload endpoint (multipart, store to /data/uploads)
- [ ] CSV parser with per-source column mappers (Otzar HaHayal, Visa Cal)
- [ ] PDF text extraction (pdf-parse)
- [ ] Claude API extractor for unstructured PDFs (Harel, Excellence)
- [ ] Normalizer → SQLite upsert
- [ ] Net worth snapshot recalculation on upload
- [ ] Government validation PDF upload endpoint
- [ ] validation.js — Claude API extracts institution list from gov PDFs
- [ ] Source comparison logic → writes source_alerts to DB
- [ ] Alerts API endpoints (list, dismiss, resolve)

### Phase 3 — Frontend Dashboard
- [ ] React app scaffold (Vite)
- [ ] Port checklist prototype → React + backend API
- [ ] Add third "Government Validation" section to checklist
- [ ] Net worth KPI cards
- [ ] Net worth over time chart (Recharts)
- [ ] Asset breakdown (donut or bar)
- [ ] Monthly spending by category
- [ ] Recent transactions list
- [ ] Upload zone with parse result feedback
- [ ] Validation upload UI + missing-source alerts panel

### Phase 4 — AI + Polish
- [ ] Monthly insight generation (Claude API)
- [ ] Insight panel in dashboard
- [ ] Monthly reminder system (email or Telegram)
- [ ] Nginx config + Docker build for frontend
- [ ] Full Docker Compose integration test on Pi

---

## Key Decisions & Constraints

1. **No scraping** — explicitly removed. All Israeli financial data is manual export only. Do not add scraping logic.
2. **SQLite not Postgres** — single user, daily updates, easy backup with `cp`. No separate DB container.
3. **ARM64** — all Docker base images must be `linux/arm64` compatible. Avoid x86-only images.
4. **Credentials in .env** — never hardcoded, never committed. `.env` in `.gitignore`.
5. **No public internet exposure** — Nginx on LAN only. Remote access via Tailscale only.
6. **ILS primary currency** — all amounts stored in ILS and USD. FX rate captured at fetch time.
7. **Claude API for AI** — model: `claude-sonnet-4-6`. Used for PDF extraction, monthly insights, and government report parsing.
8. **Hebrew content** — PDF reports from Israeli institutions are in Hebrew. Claude API handles Hebrew natively. Government validation PDFs (Har HaBituach, Pension Clearinghouse) are always in Hebrew.
9. **E*TRADE annual key renewal** — developer agreement must be re-signed annually. Build a reminder for this.
10. **Validation is advisory, not authoritative** — gov report data may lag by up to a month. Alerts are suggestions to review, not errors. User can dismiss alerts that are not relevant.

---

## Coding Conventions

- **Node.js**: ESM modules (`import/export`), async/await throughout, no callbacks
- **Error handling**: All route handlers wrapped in try/catch, consistent `{ error: string }` response shape
- **DB access**: All queries go through `src/db/db.js` — never import better-sqlite3 directly in routes
- **Environment**: Always read from `process.env`, never hardcode values
- **Logging**: `console.log` with ISO timestamp prefix for now — no logging library needed
- **React**: Functional components + hooks only, no class components
- **Styling**: CSS Modules or plain CSS — no Tailwind (avoids build complexity on Pi)
- **Git**: Conventional commits — `feat:`, `fix:`, `chore:`, `docs:`

---

## Running Locally (Development)

```bash
# Backend
cd backend
npm install
cp ../.env.example .env   # fill in keys
node src/index.js

# Frontend
cd frontend
npm install
npm run dev               # Vite dev server on :5173

# Or with Docker Compose
docker compose up --build
```

---

## Current Status

> Last updated from design conversation — Phase 1 not yet started.
> Checklist HTML prototype exists at `src/frontend/monthly-checklist.html`.
> Government validation services (Har HaBituach, Pension Clearinghouse, Har HaKesef) added as a third source tier.
> Repo structure to be scaffolded as first Claude Code task.
