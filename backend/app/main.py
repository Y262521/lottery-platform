"""FastAPI application factory."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .routers import admin, auth, lotteries, payments, results, tickets, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Run column-level migrations on existing tables first.
    from .migrations import run_migrations
    run_migrations()
    # 2. Create any brand-new tables (idempotent).
    init_db()
    # 3. Seed the admin account.
    from .seed import seed_admin
    seed_admin()
    yield


app = FastAPI(
    title="Direct-Purchase Lottery Platform API",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(lotteries.router)
app.include_router(tickets.router)
app.include_router(payments.router)
app.include_router(results.router)
app.include_router(webhooks.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": "2.0.0"}
