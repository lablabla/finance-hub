# Finance Hub — Implementation Plan

**Scope:** Full build from scaffold to Pi-ready Docker Compose stack.
**Status:** Empty repo — only CLAUDE.md and checklist HTML prototype exist.
**Approach:** Four phases matching CLAUDE.md. Each step has a concrete validation check; do not move on until it passes.

---

## Phase 1 — Foundation

### Step 1.1 — Repo scaffold & .gitignore

**Create:**
- `.gitignore` — excludes `node_modules/`, `.env`, `*.sqlite`, `backend/data/uploads/`, `backend/data/*.sqlite`
- `README.md` — one-paragraph description, local dev instructions
- Empty directories for `backend/src/`, `frontend/src/`, `nginx/`

**Validation:** `git status` shows only expected untracked files; no sensitive files leak.

---

### Step 1.2 — Docker Compose scaffold

**Create:** `docker-compose.yml` with three services:
- `backend` — builds `./backend`, volume-mounts `./backend/data:/data`, reads `.env`
- `frontend` — placeholder `nginx:alpine` serving `./frontend/dist`
- `nginx` — `nginx:alpine`, port 80, proxies `/api` → `backend:3001`, serves `/` from `./frontend/dist`

All images must support `linux/arm64`.

**Create:** `.env.example` with all variables from CLAUDE.md (no values).

**Validation:**
```bash
docker compose config   # no YAML errors
```

---

### Step 1.3 — SQLite schema + db.js

**Create:** `backend/src/db/schema.sql` — exact schema from CLAUDE.md (all 8 tables).

**Create:** `backend/src/db/db.js`:
- Opens/creates SQLite file at `process.env.DB_PATH`
- Runs `schema.sql` via `db.exec()` on first connect (idempotent — uses `CREATE TABLE IF NOT EXISTS`)
- Exports helper: `query(sql, params)`, `run(sql, params)`, `get(sql, params)`
- Never import `better-sqlite3` outside this file

**Create:** `backend/package.json` — dependencies: `express`, `better-sqlite3`, `node-cron`, `pdf-parse`, `csv-parser`, `@anthropic-ai/sdk`, `multer`, `dotenv`, `oauth-1.0a`, `nodemailer`.

> **Note on `better-sqlite3`:** It is a native addon requiring compilation. On `node:20-alpine` the build will fail without system build tools. The backend Dockerfile must include `RUN apk add --no-cache python3 make g++` before `npm ci`. See Step 4.4.

**Note on `sources` schema:** Add `frequency TEXT NOT NULL DEFAULT 'monthly'` to the `sources` table in `schema.sql`. This is needed to mark Har HaKesef as `'annual'` in seed data and render the "Annual" badge in the checklist UI. The CLAUDE.md schema omits this field — treat the plan as authoritative here.

**Validation:**
```bash
cd backend && npm install
DB_PATH=./data/test.sqlite node -e "import('./src/db/db.js').then(m => console.log('DB OK'))"
# File ./data/test.sqlite must exist after
sqlite3 ./data/test.sqlite ".tables"   # lists all 8 tables
sqlite3 ./data/test.sqlite ".schema sources" | grep frequency  # must appear
```

---

### Step 1.4 — Express app entry point + health endpoint

**Create:** `backend/src/index.js`:
- ESM module (`"type": "module"` in package.json)
- Loads `dotenv/config`
- Mounts all route files
- `GET /api/health` → `{ ok: true, db: true }`
- Listens on `process.env.PORT` (default 3001)

**Validation:**
```bash
node src/index.js &
curl http://localhost:3001/api/health   # → {"ok":true,"db":true}
```

---

### Step 1.5 — Sources CRUD endpoints + DB seed

**Create:** `backend/src/routes/sources.js`:
- `GET /api/sources` — returns all rows from `sources`
- `POST /api/sources` — inserts new source, returns created row
- `DELETE /api/sources/:id` — deletes by id, returns `{ deleted: true }`

**Create:** `backend/src/db/seed.js` — inserts the nine pre-loaded sources from CLAUDE.md (E*TRADE, Otzar HaHayal, Visa Cal, Harel Pension, Harel Keren Hishtalmut, Excellence Investments, Har HaBituach, Pension Clearinghouse, Har HaKesef). Idempotent via `INSERT OR IGNORE`. Set `frequency = 'annual'` for Har HaKesef; all others default to `'monthly'`.

**Validation:**
```bash
node src/db/seed.js
curl http://localhost:3001/api/sources | jq '. | length'   # → 9
curl -X POST http://localhost:3001/api/sources \
  -H 'Content-Type: application/json' \
  -d '{"id":"test","name":"Test","category":"other","type":"manual","format":"CSV"}' \
  | jq .id   # → "test"
curl -X DELETE http://localhost:3001/api/sources/test | jq .deleted   # → true
```

---

### Step 1.6 — Checklist API endpoints

**Create:** `backend/src/routes/checklist.js`:
- `GET /api/checklist/:year/:month` — returns all sources with their `checked`, `checked_at`, `notes` for that month. Joins `sources` + `checklist` (LEFT JOIN so sources with no row appear as unchecked).
- `POST /api/checklist/:year/:month` — body: `{ source_id, checked, notes }`. Upserts into `checklist` table. Sets `checked_at` to `datetime('now')` when `checked = 1`.

> **Month indexing:** The DB schema uses 0-indexed months (Jan=0, Dec=11), matching JavaScript's `Date.getMonth()`. The URL parameter `:month` must follow the same convention. Document this in the route file so the frontend doesn't accidentally pass 1-indexed values.

**Validation:**
```bash
curl http://localhost:3001/api/checklist/2026/3 | jq '. | length'  # → 9
curl -X POST http://localhost:3001/api/checklist/2026/3 \
  -H 'Content-Type: application/json' \
  -d '{"source_id":"etrade","checked":1}' | jq .checked_at  # → ISO timestamp
curl http://localhost:3001/api/checklist/2026/3 | jq '.[] | select(.source_id=="etrade") | .checked'  # → 1
```

---

### Step 1.7 — E*TRADE OAuth flow + portfolio fetch

**Create:** `backend/src/collectors/etrade.js`:
- OAuth 1.0a flow using the `oauth-1.0a` package: `getRequestToken()`, `buildAuthUrl(token)`, `getAccessToken(requestToken, verifier)`
- Note: CLAUDE.md mistakenly says "OAuth 2.0" — E*TRADE has always used OAuth 1.0a. The plan is correct.
- `fetchPortfolio(accessToken, accountId)` — calls `/v1/accounts/{id}/portfolio`
- `fetchBalances(accessToken, accountId)` — calls `/v1/accounts/{id}/balance`
- Returns data in the unified Account schema from CLAUDE.md

Use `process.env.ETRADE_CONSUMER_KEY` / `ETRADE_CONSUMER_SECRET` / `ETRADE_BASE_URL`.

**Create:** `backend/src/routes/etrade-auth.js` (dev/setup only):
- `GET /api/etrade/auth` — redirects to E*TRADE OAuth page
- `GET /api/etrade/callback` — exchanges verifier for access token, stores in DB or `.env`

**Validation:** (manual — requires real keys)
```
# Set ETRADE_CONSUMER_KEY and ETRADE_CONSUMER_SECRET in .env
# Visit http://localhost:3001/api/etrade/auth in browser
# Complete OAuth flow
# Confirm access token is returned
```
Unit-testable without real keys: mock HTTP calls return sample portfolio JSON; verify normalizer output shape matches unified schema.

---

### Step 1.8 — Scheduler

**Create:** `backend/src/collectors/scheduler.js`:
- `node-cron` job: runs E*TRADE portfolio + balance fetch daily at 06:00 local time
- On success: upserts accounts, recalculates net worth snapshot, writes to `snapshots` table
- Logs ISO timestamp + result count on each run
- Monthly reminder job: 1st of each month → sends email or Telegram message (whichever env vars are present)
- Annual E*TRADE developer agreement reminder: fires on Jan 1 each year

**Validation:**
```bash
# Trigger manually:
node -e "import('./src/collectors/scheduler.js').then(m => m.runNow())"
# Confirm accounts table updated and snapshots has new row for today
```

---

## Phase 2 — Upload Pipeline

### Step 2.1 — File upload endpoint

**Create:** `backend/src/routes/upload.js`:
- `POST /api/upload` — `multipart/form-data`, fields: `file` + `source_id`
- Stores file to `/data/uploads/{source_id}/{timestamp}-{originalname}`
- Detects format (CSV vs PDF) by extension
- Routes to correct parser
- Returns `{ ok, records, errors }`

Use `multer` with disk storage. Max file size: 10MB.

**Validation:**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "source_id=otzar-hahayal" \
  -F "file=@test/fixtures/sample.csv"
# → {"ok":true,"records":N,"errors":[]}
# File exists in backend/data/uploads/otzar-hahayal/
# uploads table has new row
```

---

### Step 2.2 — CSV parser + per-source mappers

**Create:** `backend/src/parsers/csv.js`:
- Generic CSV parse using `csv-parser`
- Per-source mappers keyed by `source_id`:
  - `otzar-hahayal` — maps Hebrew column headers to unified Transaction schema
  - `visa-cal` — maps Cal credit card CSV columns to unified Transaction schema
- Each mapper returns `{ account, transactions[] }` in unified schema
- Deduplication: transaction `id` is SHA-256 hash of `accountId + date + description + amount`

**Create test fixtures:** `backend/test/fixtures/otzar-hahayal-sample.csv`, `visa-cal-sample.csv` with anonymised rows.

**Validation:**
```bash
node -e "
  import('./src/parsers/csv.js').then(({ parseCSV }) =>
    parseCSV('test/fixtures/otzar-hahayal-sample.csv', 'otzar-hahayal')
      .then(r => console.log(r.transactions.length, r.account))
  )
"
# transactions array non-empty, all have id/date/amount/currency fields
```

---

### Step 2.3 — PDF text extraction

**Create:** `backend/src/parsers/pdf.js`:
- Wraps `pdf-parse` to extract raw text from a PDF buffer
- Returns `{ text: string, pages: number }`
- Handles Hebrew RTL text (pdf-parse preserves encoding; Claude handles interpretation)

**Validation:**
```bash
node -e "
  import fs from 'fs';
  import('./src/parsers/pdf.js').then(({ extractText }) =>
    extractText(fs.readFileSync('test/fixtures/sample.pdf'))
      .then(r => console.log(r.pages, r.text.slice(0,200)))
  )
"
```

---

### Step 2.4 — Claude API extractor for unstructured PDFs

**Create:** `backend/src/parsers/ai-extractor.js`:
- Takes `{ text, source_id }` — the raw PDF text plus source identifier
- Builds a prompt instructing Claude to extract structured data (account name, balance, transactions list, as-of date) from the text
- Model: `claude-sonnet-4-6`
- Uses JSON output mode (structured tool call or `response_format: json`)
- Returns parsed JS object matching unified schema
- Per-source system prompt variants for Harel (pension/study fund) and Excellence (investment portfolio)
- Include prompt caching (`cache_control: { type: "ephemeral" }`) on the system prompt to reduce cost on repeated uploads

**Validation:**
```bash
ANTHROPIC_API_KEY=sk-... node -e "
  import('./src/parsers/ai-extractor.js').then(({ extractFromPDF }) =>
    extractFromPDF({ text: '<sample harel text>', source_id: 'harel-pension' })
      .then(r => console.log(JSON.stringify(r, null, 2)))
  )
"
# Output has account.balance, account.as_of, transactions array
```

---

### Step 2.5 — Normalizer → SQLite upsert

**Create:** `backend/src/normalizer.js`:
- `normalizeAndSave(parsedData, source_id)`:
  1. Validates parsed data against unified schema (throws on missing required fields)
  2. Upserts account row (`INSERT OR REPLACE INTO accounts`)
  3. Upserts each transaction (`INSERT OR IGNORE INTO transactions` — ignore duplicates by id)
  4. Recalculates net worth snapshot for `as_of` date
  5. Writes/updates `snapshots` row
  6. Returns `{ accountsUpserted, transactionsInserted, transactionsSkipped }`

**Validation:**
```bash
# After uploading otzar-hahayal-sample.csv:
sqlite3 backend/data/finance.sqlite "SELECT COUNT(*) FROM transactions;"
# > 0 before upload, > 0 after
sqlite3 backend/data/finance.sqlite "SELECT * FROM snapshots ORDER BY date DESC LIMIT 1;"
# Row exists with non-null total_ils
```

---

### Step 2.6 — Government validation PDF upload

**Create:** `backend/src/routes/validate.js`:
- `POST /api/validate/upload` — `multipart/form-data`, fields: `file` + `report_type` (`har_habituach` | `pension_clearinghouse` | `har_hakesef`)
- Extracts text via `pdf.js`
- Sends to `validation.js` (Step 2.7)
- Stores raw text + institutions JSON in `validation_reports`
- Returns `{ ok, institutions: string[], alertsCreated: number }`

---

### Step 2.7 — validation.js — institution extraction + alert generation

**Create:** `backend/src/parsers/validation.js`:
- `extractInstitutions(text, report_type)`:
  - Calls Claude API with a Hebrew-aware prompt to extract a list of institution names + product types from the raw text
  - Returns `Array<{ institution: string, product_type: string }>`
- `compareWithSources(institutions, report_id)`:
  - Loads all active sources from DB
  - For each institution in the report: match against source names using simple case-insensitive `includes` check
  - Do **not** use Levenshtein or fuzzy matching — Hebrew institution names vary too much in abbreviation and transliteration for a distance threshold to be reliable. Instead, embed the matching decision in the Claude extraction prompt: instruct Claude to return a `matched_source_id` field (nullable) alongside each institution it extracts, giving it the current source list as context. If `matched_source_id` is null → insert into `source_alerts`.
  - Returns `{ matched: number, alertsCreated: number }`

**Validation:**
```bash
# Upload a Har HaBituach PDF
curl -X POST http://localhost:3001/api/validate/upload \
  -F "report_type=har_habituach" \
  -F "file=@test/fixtures/har-habituach-sample.pdf"
# → {"ok":true,"institutions":[...],"alertsCreated":N}
curl http://localhost:3001/api/validate/alerts | jq '. | length'  # → N
```

---

### Step 2.8 — Alerts API endpoints

**Add to** `backend/src/routes/validate.js`:
- `GET /api/validate/alerts` — returns all non-dismissed, non-resolved alerts joined with report metadata
- `POST /api/validate/alerts/:id/dismiss` — sets `dismissed=1`, `dismissed_at=now()`
- `POST /api/validate/alerts/:id/resolve` — body: `{ source_id }`. Sets `resolved=1`, links `resolved_source_id`

**Validation:**
```bash
ALERT_ID=$(curl -s http://localhost:3001/api/validate/alerts | jq '.[0].id')
curl -X POST http://localhost:3001/api/validate/alerts/$ALERT_ID/dismiss
curl http://localhost:3001/api/validate/alerts | jq "map(select(.id==$ALERT_ID))"  # empty
```

---

## Phase 3 — Frontend Dashboard

### Step 3.1 — React app scaffold

**Create:** `frontend/` using Vite:
```bash
cd frontend && npm create vite@latest . -- --template react
```
- Remove Tailwind (not used — plain CSS per CLAUDE.md)
- Add `recharts` dependency
- Configure Vite proxy: `/api` → `http://localhost:3001` (dev only)
- CSS Modules for all component styles

**Create:** `frontend/src/api/client.js` — thin fetch wrapper:
- `get(path)`, `post(path, body)`, `del(path)`
- All prefix `/api`
- On non-2xx: throws `{ status, message }` parsed from response body

**Validation:**
```bash
cd frontend && npm run dev
curl http://localhost:5173/api/health   # proxied → {"ok":true,"db":true}
```

---

### Step 3.2 — App shell + Sidebar

**Create:** `frontend/src/App.jsx`:
- Client-side routing using `react-router-dom` (hash router — no server config needed)
- Routes: `/`, `/checklist`, `/upload`, `/validate`, `/insights`
- Renders `<Sidebar>` + `<Outlet>`

**Create:** `frontend/src/components/shared/Sidebar.jsx`:
- Nav links: Dashboard, Monthly Checklist, Upload, Validation, Insights
- Highlights active route
- Matches visual style of the HTML prototype (dark sidebar, white content area)

**Validation:** Load `http://localhost:5173` in browser. Sidebar visible, all nav links navigate without 404.

---

### Step 3.3 — Monthly Checklist (port from HTML prototype)

**Create:** `frontend/src/components/Checklist/MonthlyChecklist.jsx`:
- Month selector in sidebar (previous 12 months, current highlighted)
- Progress ring — `checked / total * 100`
- Three sections:
  1. **API Sources** (auto) — E*TRADE
  2. **Manual Sources** — Otzar HaHayal, Visa Cal, Harel Pension, Harel Keren Hishtalmut, Excellence Investments
  3. **Government Validation** — Har HaBituach (monthly), Pension Clearinghouse (monthly), Har HaKesef (annual — badge says "Annual")
- Each source row: checkbox, name, `checked_at` timestamp, notes field
- Data loaded from `GET /api/sources` + `GET /api/checklist/:year/:month`
- Check/uncheck calls `POST /api/checklist/:year/:month`
- Add source form: name, category, type, format, URL → `POST /api/sources`
- Remove source: `DELETE /api/sources/:id`

Replace all `localStorage` from the HTML prototype with backend API calls.

**Create:** `frontend/src/components/Checklist/SourceItem.jsx` — single source row.
**Create:** `frontend/src/components/Checklist/AddSourceForm.jsx` — inline form.

**Validation:**
- Check a source → reload page → still checked (state is in DB, not localStorage)
- Add a source → appears in list
- Delete a source → removed from list and from DB
- Har HaKesef row shows "Annual" badge, not a monthly checkbox

---

### Step 3.4 — Net worth KPI cards

**Create:** `frontend/src/components/Dashboard/NetWorthCard.jsx`:
- Fetches `GET /api/accounts`
- Displays: Total Net Worth (ILS), Total Net Worth (USD), breakdown by category (bank, pension, invest, etc.)
- Refresh button triggers re-fetch

**Validation:** Values match what's in the `accounts` table after a CSV upload.

---

### Step 3.5 — Net worth over time chart

**Create:** `frontend/src/components/Dashboard/NetWorthChart.jsx`:
- Fetches `GET /api/snapshots?from=<12-months-ago>&to=<today>`
- Renders `<LineChart>` from Recharts with date on X, `total_ils` on Y
- Tooltip shows ILS + USD

**Validation:** Upload two CSV files with different `as_of` dates → chart shows two data points.

---

### Step 3.6 — Asset breakdown + spending chart

**Create:** `frontend/src/components/Dashboard/AssetBreakdown.jsx`:
- `<PieChart>` breakdown of latest snapshot's `breakdown` JSON field by category

**Create:** `frontend/src/components/Dashboard/SpendingChart.jsx`:
- Fetches `GET /api/transactions?from=<month-start>&to=<month-end>`
- Groups by `category`, renders `<BarChart>`

**Validation:** Charts render without errors; empty state message shown when no data.

---

### Step 3.7 — Recent transactions list

**Create:** `frontend/src/components/Dashboard/RecentTransactions.jsx`:
- Fetches `GET /api/transactions?from=<30-days-ago>`
- Table: date, description, category, amount (colour-coded debit/credit), account

**Validation:** Transactions from uploaded CSV appear in table.

---

### Step 3.8 — Upload zone

**Create:** `frontend/src/components/Upload/UploadZone.jsx`:
- Drag-and-drop + file picker
- Source selector dropdown (loads from `/api/sources`)
- On upload: `POST /api/upload` multipart
- Shows spinner during upload

**Create:** `frontend/src/components/Upload/ParseResult.jsx`:
- On success: `{ records, errors }` summary
- On error: error message from API

**Validation:**
- Drag a CSV onto the zone → spinner → success with record count
- Upload a bad file → error message shown, no crash

---

### Step 3.9 — Validation upload + alerts panel

**Create:** `frontend/src/components/Validation/ValidationUpload.jsx`:
- Separate upload zone, report type selector (`har_habituach` | `pension_clearinghouse` | `har_hakesef`)
- Posts to `POST /api/validate/upload`

**Create:** `frontend/src/components/Validation/AlertsList.jsx`:
- Fetches `GET /api/validate/alerts`
- Renders list of `AlertItem` components

**Create:** `frontend/src/components/Validation/AlertItem.jsx`:
- Shows institution name, product type, report date
- "Dismiss" button → `POST /api/validate/alerts/:id/dismiss`
- "Resolve" button → opens source selector → `POST /api/validate/alerts/:id/resolve`

**Validation:**
- After uploading a gov PDF, alerts appear in the list
- Dismiss → alert disappears
- Resolve with a source → alert disappears, source's `resolved_source_id` set

---

## Phase 4 — AI + Polish

### Step 4.1 — Monthly insight generation

**Create:** `backend/src/insights.js`:
- `generateInsight(year, month)`:
  - Fetches all accounts, transactions for the month, and previous month's snapshot from DB
  - Builds a context prompt with the financial data (Hebrew institutions → translate institution names, keep amounts)
  - Calls `claude-sonnet-4-6` with prompt caching on system prompt
  - Returns markdown narrative
  - Upserts into `insights` table

**Add to routes:** `backend/src/routes/insights.js`:
- `GET /api/insights/:year/:month` — returns stored insight or `{ content: null }`
- `POST /api/insights/:year/:month` — triggers generation, returns `{ content }`

**Validation:**
```bash
curl -X POST http://localhost:3001/api/insights/2026/3 | jq .content | head -5
# Non-empty markdown string
curl http://localhost:3001/api/insights/2026/3 | jq .content | head -5
# Same content (persisted)
```

---

### Step 4.2 — Insight panel in dashboard

**Create:** `frontend/src/components/Insights/InsightPanel.jsx`:
- Fetches `GET /api/insights/:year/:month`
- Renders markdown (use `react-markdown` or simple `dangerouslySetInnerHTML` with sanitization)
- "Generate" button → `POST /api/insights/:year/:month` → shows spinner → renders result
- Month picker to view past insights

**Validation:** Click Generate → loading state → markdown insight appears.

---

### Step 4.3 — Monthly reminder system

**Add to** `backend/src/collectors/scheduler.js`:
- 1st of each month at 08:00: if `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set → send Telegram message
- Otherwise if SMTP vars set → send email via `nodemailer`
- Message: "Finance Hub reminder: download your monthly exports for [Month Year]"
- Annual: Jan 1 → reminder to renew E*TRADE developer agreement

**Validation:**
```bash
# Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
node -e "import('./src/collectors/scheduler.js').then(m => m.sendReminder())"
# Check Telegram for message
```

---

### Step 4.4 — Nginx config + frontend Docker build

**Create:** `nginx/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
  }

  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
}
```

**Create:** `frontend/Dockerfile` (multi-stage):
- Stage 1: `node:20-alpine` — `npm ci && npm run build`
- Stage 2: `nginx:alpine` — copies `dist/` to `/usr/share/nginx/html`

**Create:** `backend/Dockerfile`:
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++   # required for better-sqlite3 native compilation
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
CMD ["node", "src/index.js"]
```

**Update:** `docker-compose.yml` — remove the standalone `frontend` service. The frontend multi-stage build produces a self-contained nginx image; there is no runtime frontend container. The compose file should have two services only: `backend` and `nginx`. The nginx image is built from `./frontend/Dockerfile` (stage 2 already includes nginx). Update nginx service accordingly:
```yaml
nginx:
  build: ./frontend        # uses the multi-stage Dockerfile
  restart: unless-stopped
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - backend
```

**Validation:**
```bash
docker compose build   # no errors
docker compose up -d
curl http://localhost/api/health   # → {"ok":true,"db":true}
curl http://localhost/              # → HTML page
```

---

### Step 4.5 — Full integration test on Pi

**Run on Raspberry Pi 5:**
```bash
git clone <repo> finance-hub
cd finance-hub
cp .env.example .env   # fill in keys
docker compose up --build -d
# Wait ~2min for builds on ARM64
curl http://localhost/api/health
```

**End-to-end checklist:**
- [ ] Health endpoint returns `{ ok: true, db: true }`
- [ ] Seed sources appear in `/api/sources`
- [ ] Upload an Otzar HaHayal CSV → transactions appear in DB
- [ ] Upload a Harel pension PDF → Claude extracts balance + transactions
- [ ] Net worth chart shows data point for uploaded date
- [ ] Monthly checklist loads, check-off persists after page reload
- [ ] Upload a Har HaBituach PDF → institution alerts appear
- [ ] Dismiss an alert → disappears
- [ ] Generate insight for current month → markdown appears
- [ ] Tailscale: access dashboard from phone via Tailscale IP

---

## Implementation Notes

### Sequence dependencies

```
1.3 (db.js) → 1.4 (express) → 1.5 (sources) → 1.6 (checklist)
                                              → 2.1 (upload) → 2.2 (CSV) → 2.5 (normalizer)
                                                             → 2.3 (PDF) → 2.4 (AI extractor) → 2.5
                                                             → 2.6 (gov upload) → 2.7 (validation)
3.1 (scaffold) → 3.2 (shell) → 3.3 (checklist) [needs 1.5 + 1.6]
                              → 3.4–3.9 [need 2.x]
4.1 (insights backend) → 4.2 (insights frontend)
```

### Prompt caching strategy

Both `ai-extractor.js` and `insights.js` use long system prompts. Mark them with `cache_control: { type: "ephemeral" }` to get a 5-minute TTL cache hit on repeated calls within a session. This meaningfully reduces cost when re-processing uploads.

### ARM64 image compatibility

All Dockerfiles must use:
- `node:20-alpine` (multi-arch)
- `nginx:alpine` (multi-arch)

Avoid any image that is x86-only. Verify with: `docker buildx imagetools inspect <image> | grep -i arm64`.

### Hebrew PDF handling

`pdf-parse` extracts raw text bytes; Claude handles RTL and Hebrew natively. Do not attempt to parse Hebrew column headers in code — pass raw text to Claude and let it map fields. Only write code mappers for CSV sources where column headers are fixed and known.

### E*TRADE OAuth storage

During development: store access token in `.env` after first OAuth flow. In production on the Pi: store in a `config` table in SQLite (add if needed). Never store in frontend or logs.
