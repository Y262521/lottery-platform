"""Database session + engine setup (SQLAlchemy 2.x style)."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


def _normalize_db_url(url: str) -> str:
    """Render/Heroku expose postgres as `postgres://` (or `postgresql://`),
    which SQLAlchemy rejects. Re-route to the psycopg2 driver."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DB_URL = _normalize_db_url(settings.DATABASE_URL)

# check_same_thread=False lets FastAPI request threads share the SQLite connection.
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}

engine = create_engine(DB_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Safe to call repeatedly."""
    from . import models  # noqa: F401  ensure models are registered

    Base.metadata.create_all(bind=engine)
