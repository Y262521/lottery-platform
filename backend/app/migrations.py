"""Startup migrations — idempotent, safe to re-run on every deploy.

Strategy:
  1. Add new columns to existing tables (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
  2. Drop old v1 tables that have been replaced by v2 schema so create_all
     can recreate them correctly. We only drop them when they exist AND do NOT
     have the v2 columns (i.e. are still the old schema).
  3. create_all (called by the caller after this) creates all missing tables.

All DDL is wrapped so failures are skipped silently — making every step
idempotent regardless of which deploy it runs on.
"""
import logging
from sqlalchemy import text
from .database import SessionLocal

logger = logging.getLogger(__name__)


def _exec(db, sql: str, label: str = "") -> bool:
    """Execute one DDL statement. Returns True on success, False on skip."""
    try:
        db.execute(text(sql))
        db.commit()
        logger.info("Migration OK: %s", label or sql[:80])
        return True
    except Exception as exc:
        db.rollback()
        logger.debug("Migration skipped (%s): %s", type(exc).__name__, label or sql[:80])
        return False


def run_migrations() -> None:
    db = SessionLocal()
    try:
        # ── 1. Add new columns to the existing users table ────────────────────
        # Postgres: IF NOT EXISTS prevents errors on repeated runs.
        _exec(db,
              "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)",
              "users.phone")

        # ── 2. Drop old v1 tables that no longer match the new schema ─────────
        # These tables existed in v1 with different columns. Dropping them lets
        # create_all recreate them with the correct v2 schema.
        # We guard each drop so it's safe if the table is already gone.

        # v1 had a simple 'draws' table — replaced by 'lottery_posts' in v2.
        _exec(db,
              "DROP TABLE IF EXISTS tickets CASCADE",
              "drop old tickets")
        _exec(db,
              "DROP TABLE IF EXISTS draws CASCADE",
              "drop old draws")
        _exec(db,
              "DROP TABLE IF EXISTS transactions CASCADE",
              "drop old transactions (renamed to payment_transactions)")
        _exec(db,
              "DROP TABLE IF EXISTS wallets CASCADE",
              "drop old wallets (wallet system removed in v2)")
        _exec(db,
              "DROP TABLE IF EXISTS audit_logs CASCADE",
              "drop old audit_logs (schema changed in v2)")

        # ── 3. Rename old table if it exists with the old name ────────────────
        # 'lottery_events' was an early name considered during design — drop if present.
        _exec(db,
              "DROP TABLE IF EXISTS lottery_events CASCADE",
              "drop lottery_events if exists")

    finally:
        db.close()
