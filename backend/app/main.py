"""FastAPI application factory."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from .config import settings
from .database import init_db
from .media import UPLOAD_DIR
from .routers import admin, auth, lotteries, payments, results, tickets


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
# Always include the known production Vercel URL
_ALWAYS_ALLOW = [
    "https://lottery-platform-lilac.vercel.app",
    "https://lottery-platform-8c1aovjin-yonasteklu284-9543s-projects.vercel.app",
]
for _o in _ALWAYS_ALLOW:
    if _o not in origins:
        origins.append(_o)

app.add_middleware(
    CORSMiddleware,
    # Use wildcard so any Vercel preview URL also works.
    # allow_credentials must be False when allow_origins contains "*".
    # Our auth uses Authorization header (not cookies) so this is fine.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router)
app.include_router(lotteries.router)
app.include_router(tickets.router)
app.include_router(payments.router)
app.include_router(results.router)
app.include_router(admin.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch any unhandled exception and return JSON with CORS header.
    Without this, a 500 has no Access-Control-Allow-Origin header and
    the browser reports it as a CORS error instead of a server error.
    """
    import traceback, logging
    logging.getLogger(__name__).error(
        "Unhandled exception on %s %s: %s",
        request.method, request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/uploads/{file_path:path}", tags=["media"])
def serve_upload(file_path: str):
    """Serve uploaded media files with directory traversal protection."""
    full_path = (UPLOAD_DIR / file_path).resolve()
    base_dir = UPLOAD_DIR.resolve()
    if not str(full_path).startswith(str(base_dir)) or not full_path.is_file():
        return JSONResponse(status_code=404, content={"detail": "File not found"})
    return FileResponse(str(full_path))
