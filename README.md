# Finance Hub

A self-hosted personal finance dashboard running on a Raspberry Pi 5. Aggregates financial data from E*TRADE (API) and Israeli financial institutions (manual CSV/PDF export), displays a unified net worth dashboard, and uses the Claude API to extract data from uploaded documents and generate monthly insights.

## Local Development

```bash
# Backend
cd backend
npm install
cp ../.env.example .env   # fill in your keys
node src/index.js         # runs on :3001

# Frontend
cd frontend
npm install
npm run dev               # Vite dev server on :5173

# Or everything via Docker Compose
cp .env.example .env
docker compose up --build
# Dashboard available at http://localhost
```

## Remote Access

Access remotely via Tailscale — no ports exposed to the internet.
