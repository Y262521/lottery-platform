"""FastAPI application factory + startup."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin, auth, draws, tickets, wallet


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed the demo admin on first run.
    init_db()
    from .seed import seed_admin

    seed_admin()
    yield


app = FastAPI(
    title="Lottery Platform API",
    description="Secure, provably-fair lottery/sweepstakes backend (demo).",
    version="1.0.0",
    lifespan=lifespan,
)

# Permissive CORS for the frontend. Restrict via CORS_ORIGINS env in production.
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(draws.router)
app.include_router(tickets.router)
app.include_router(wallet.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "lottery-platform-api"}


@app.get("/", tags=["meta"])
def root():
    return {
        "service": "lottery-platform-api",
        "docs": "/docs",
        "health": "/health",
    }
