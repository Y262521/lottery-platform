# Lottery Platform — Backend (FastAPI)

Provably-fair lottery/sweepstakes API.

## Run

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python run.py
```

API then available at `http://localhost:8000`, docs at `/docs`.

## Demo admin

```
email: admin@lottery.local
password: admin12345
```

New users get a sign-up bonus (`SIGNUP_BONUS`, default 100) so you can buy tickets
immediately without a payment gateway.

## Architecture notes

- **Provably-fair draw engine** (`app/draw_engine.py`): commit-reveal scheme.
  An admin-created draw generates a cryptographically secure `server_seed`
  (OS entropy via `secrets`) and publishes only its SHA-256 hash. At draw time a
  public `client_seed` is captured, and the winning numbers are derived from
  `HMAC(server_seed, client_seed:nonce)` using a Fisher-Yates shuffle driven by
  the HMAC stream. The server seed is revealed afterward so anyone can verify
  `SHA-256(server_seed) == published_hash` and recompute the result.
- **Auth**: JWT access + refresh tokens, bcrypt password hashing, RBAC
  (`USER`, `ADMIN`, `AUDITOR`).
- **Wallet**: append-only ledger (`Transaction`) + balance, with overdraft
  protection. Real deployments should hold a `SELECT ... FOR UPDATE` row lock
  during debits (SQLite serializes writes; PostgreSQL/MySQL need explicit locks).
- **Audit**: immutable `AuditLog` for security/admin actions.

## Safety reminders for production

This is a demo. Before any real deployment:

- Replace `SECRET_KEY` with a strong random value.
- Switch `DATABASE_URL` to PostgreSQL/MySQL with connection pooling.
- Add rate limiting (e.g. slowapi / API Gateway / Cloudflare) and DDoS protection.
- Replace the demo `/wallet/deposit` with a real payment-gateway webhook.
- Add KYC/age & geolocation verification and the required gaming licenses.
- Use a public, well-known `client_seed` (e.g. a future block hash) for draws.
