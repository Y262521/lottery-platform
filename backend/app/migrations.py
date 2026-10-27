"""Lightweight startup migrations.

Since we use SQLAlchemy's create_all (which only creates missing tables,
never alters existing ones), we run these DDL statements manually on startup
to handle column additions to pre-existing tables.

Each statement is wrapped in a try/except so a column that already exists
is silently skipped — making every migration idempotent and safe to re-run.
"""
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from .database import SessionLocal

logger = logging.getLogger(__name__)


_MIGRATIONS = [
    # v1 → v2: added phone column to users
    "ALTER TABLE users ADD COLUMN phone VARCHAR(30)",

    # v1 → v2: old tables that need to be dropped so create_all recreates them
    # with the new schema. We only drop if the new columns don't exist yet.
    # NOTE: dropping means any old data is lost — acceptable for a fresh v2 deploy.

    # v2: new tables (create_all handles these — listed here for documentation)
    # lottery_posts, tickets, payment_transactions, draw_results, audit_logs
]


def run_migrations() -> None:
    db: Session = SessionLocal()
    try:
        for sql in _MIGRATIONS:
            try:
                db.execute(text(sql))
                db.commit()
                logger.info("Migration applied: %s", sql[:60])
            except Exception as e:
                db.rollback()
                # Most likely "column already exists" — skip silently.
                logger.debug("Migration skipped (%s): %s", type(e).__name__, sql[:60])
    finally:
        db.close()
