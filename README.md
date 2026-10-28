# Emerald Draw — Direct-Purchase Lottery Platform

A full-stack lottery/sweepstakes platform with direct payment integration
(Chapa & Telebirr), Cloudinary media storage, manual draw results with
video proof, and full admin management.

Dark green + off-white theme. Amharic / English bilingual.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python FastAPI + SQLAlchemy + PostgreSQL |
| Frontend | React + Vite + Tailwind CSS |
| Payments | Chapa, Telebirr, Bank Transfer |
| Media | Cloudinary (images + video) |
| Email | Resend |
| Database | Neon (free Postgres) |
| Backend hosting | Render (free tier) |
| Frontend hosting | Vercel (free tier) |

## How it works

**Admin flow:**
1. Admin creates a lottery post with title, prize description, ticket price,
   draw date, optional ticket limit, and optional cover/prize photos.
2. Admin publishes the lottery (status: ACTIVE) — it becomes visible to users.
3. Admin manually closes sales when enough tickets are sold, or the system
   auto-closes when the ticket limit is reached.
4. The draw is conducted **offline/physically**.
5. Admin uploads the draw video proof + winner photos and enters the
   winning ticket numbers. The system notifies winners by email.

**User flow:**
1. Users browse active lottery posts with images and prize details.
2. Users select quantity and payment method (Chapa, Telebirr, or Bank Transfer).
3. Payment is processed directly — no wallet needed.
4. On payment verification (via webhook), unique ticket numbers are generated
   and a confirmation email is sent.
5. Users can view draw results, video proof, and winner listings.

## Local development

```powershell
# Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # fill in your keys
python run.py            # http://localhost:8000 — docs at /docs

# Frontend (new terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Deploy

### 1. Backend → Render

Render → **New → Blueprint** → connect `Y262521/lottery-platform`

Blueprint name: anything (e.g. `lottery-platform`)
Blueprint path: `render.yaml`

After creation, go to **Environment tab** and fill in:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon Postgres URL |
| `CORS_ORIGINS` | Your Vercel URL (after frontend deploy) |
| `FRONTEND_URL` | Your Vercel URL |
| `ADMIN_PASSWORD` | A strong password |
| `CLOUDINARY_CLOUD_NAME` | From cloudinary.com |
| `CLOUDINARY_API_KEY` | From cloudinary.com |
| `CLOUDINARY_API_SECRET` | From cloudinary.com |
| `CHAPA_SECRET_KEY` | From dashboard.chapa.co |
| `CHAPA_WEBHOOK_SECRET` | From Chapa webhook settings |
| `RESEND_API_KEY` | From resend.com (optional) |

### 2. Frontend → Vercel

Vercel → **Add New → Project** → import this repo

- Root Directory: `frontend`
- Env var: `VITE_API_BASE_URL` = your Render service URL
  (e.g. `https://lottery-platform-6dv6.onrender.com`)

### 3. Webhook URLs (register with payment gateways)

After both services are live, register these webhook URLs:

- **Chapa:** `https://YOUR-RENDER-URL/api/webhooks/chapa`
- **Telebirr:** `https://YOUR-RENDER-URL/api/webhooks/telebirr`

## Admin login

```
Email:    yonasteklu284@gmail.com
Password: (whatever you set as ADMIN_PASSWORD on Render, defaults to yona@1230)
```

## Database schema

| Table | Purpose |
|-------|---------|
| `users` | Accounts + roles (USER, ADMIN, AUDITOR) |
| `lottery_posts` | Events with prize, price, media, ticket limit |
| `tickets` | Confirmed ticket entries (unique ticket_no per lottery) |
| `payment_transactions` | One row per payment attempt, holds webhook payload |
| `draw_results` | Winning ticket numbers + video/photo proof |
| `audit_logs` | Append-only record of all admin/security actions |

## API docs

Live at `https://YOUR-RENDER-URL/docs` (Swagger UI, auto-generated).
