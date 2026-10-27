# Emerald Draw — Provably-Fair Lottery Platform

A full-stack lottery/sweepstakes demo with a cryptographically secure, auditable
draw engine. Built around a **dark green + off-white** theme.

## Stack

- **Backend** — Python FastAPI, SQLAlchemy, JWT auth (access + refresh), bcrypt,
  SQLite (swap for PostgreSQL in production). See `backend/`.
- **Frontend** — React + Vite + Tailwind CSS, React Router. See `frontend/`.

## Quick start

```powershell
# 1) Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python run.py          # http://localhost:8000  (docs at /docs)

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev           # http://localhost:5173
```

## Demo credentials

- Admin: `admin@lottery.local` / `admin12345`
- Or register a new user (gets a $100 demo wallet bonus)

## How a draw works (provable fairness)

1. **Commit** — An admin creates a draw. The backend generates a 256-bit
   `server_seed` (OS entropy via `secrets`), stores it privately, and publishes
   only its SHA-256 hash. Sales open.
2. **Freeze** — Just before the draw, sales close.
3. **Draw** — A public `client_seed` is captured (operator-supplied, e.g. a
   future block hash). Winning numbers are derived from a Fisher-Yates shuffle
   driven by `HMAC(server_seed, client_seed:nonce)`.
4. **Reveal** — The server seed is published. Anyone can check
   `SHA-256(server_seed) == published_hash` and recompute the result. The live
   draw page does this verification in-browser using `SubtleCrypto`.

See `backend/app/draw_engine.py`.

## Key features

- JWT auth with refresh-on-expiry, RBAC (`USER`, `ADMIN`, `AUDITOR`)
- Wallet with append-only ledger, overdraft protection, row-lock hint for concurrency
- Ticket purchase, quick-pick (CSPRNG), cart, settlement
- Draw lifecycle: schedule → freeze → run → cancel (with refunds)
- Admin: metrics dashboard, draw management, user role/active toggles, audit log
- Audit log of security/admin actions for regulatory review
- Live countdowns + animated number reveal

## Production hardening (not done here)

- Strong random `SECRET_KEY`; PostgreSQL with pooling
- Rate limiting / DDoS protection (Cloudflare, API Gateway, slowapi)
- Real payment-gateway webhooks instead of the demo `/wallet/deposit`
- KYC, age & geolocation verification, gaming licenses
- Public, well-known `client_seed` (e.g. a future block hash)
- Append-only/immutable audit storage (e.g. a dedicated log store)

> This is a demonstration project and is not affiliated with any real lottery.

## Deploy (free tier: Render + Vercel)

Already pushed to: https://github.com/Y262521/lottery-platform

> One-click deploy buttons below. They open the platform pre-filled with this
> repo. You just sign in with your account and confirm.

### 1. Backend on Render (free web service, auto-deploys on push)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Y262521/lottery-platform)

- The button reads `render.yaml` at the repo root and provisions `emerald-draw-api`.
- Or manually: Render dashboard → **New → Blueprint** → pick this repo.
- During setup, set `DATABASE_URL` to your free **Neon** Postgres connection
  string (below). The service waits until this is set before starting.
- Note the service URL, e.g. `https://emerald-draw-api.onrender.com`.
- Health check at `/health`; API docs at `/docs`.
- **Auto-deploy**: when you push to `main`, Render pulls and redeploys
  automatically (`autoDeploy: true` in `render.yaml`) — no manual trigger needed.

**Get a free persistent Postgres from Neon** (so data survives redeploys):
1. Sign up at https://neon.tech → create a project → copy the connection string
   (looks like `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`).
2. Paste it as the `DATABASE_URL` env var on Render.
3. On first boot the app auto-creates all tables and the admin user.

> The free Render web service has an **ephemeral filesystem**, so SQLite would
> lose all data on every redeploy. Using an external Postgres (Neon) is what
> makes this a normal, persistent deployment.

### 2. Frontend on Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Y262521/lottery-platform)

- Or manually: Vercel → **Add New → Project** → import this repo.
- Set **Root Directory** to `frontend` (Vercel detects Vite automatically).
- Add environment variable: `VITE_API_BASE_URL=https://emerald-draw-api.onrender.com`
  (your Render backend URL from step 1).
- On Render, set backend `CORS_ORIGINS` to your Vercel URL
  (`https://<project>.vercel.app`) so the browser allows the API calls.
- Deploy. Vercel runs `npm install && npm run build` and serves `dist/`.
  `vercel.json` adds the SPA fallback so deep links (e.g. `/wallet`) work.
- **Auto-deploy**: Vercel redeploys automatically whenever you push to `main`.

### Demo admin
`admin@lottery.local` / `admin12345`
