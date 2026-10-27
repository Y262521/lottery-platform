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
