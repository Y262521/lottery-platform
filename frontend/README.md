# Lottery Platform — Frontend (React + Vite + Tailwind)

Provably-fair lottery UI. Dark green + off-white theme only.

## Run

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api/*` to the backend on
`http://localhost:8000`, so start the backend first.

## Pages

| Route          | Auth    | Purpose                                         |
|----------------|---------|-------------------------------------------------|
| `/`            | public  | Landing + next-draw countdown + fairness explainer |
| `/draws`       | public  | Browse open draws and past results              |
| `/draws/:id`   | public  | Interactive number picker + cart + buy           |
| `/live/:id`    | public  | Live draw view, animated reveal, verify panel    |
| `/results`     | public  | Past winning numbers                             |
| `/login`       | public  | Sign in (demo admin pre-filled)                  |
| `/register`    | public  | Create account ($100 demo bonus)                |
| `/tickets`     | user    | Your tickets and win/loss status                 |
| `/wallet`      | user    | Balance, demo top-up, transaction ledger         |
| `/admin`       | admin   | Metrics, draw lifecycle, users, audit log        |

## Demo admin

```
email: admin@lottery.local
password: admin12345
```

## Theming

All colors come from `tailwind.config.js`:
- `ink.*`  — near-black green background/surface layers
- `green.*` — the single accent family
- `cream.*` — "dark white" muted off-whites for text

No other accent colors are used.
