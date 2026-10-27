"""Startup migrations — idempotent, safe to re-run on every deploy.

Strategy:
  1. Add missing columns to existing tables using IF NOT EXISTS.
  2. Drop old v1-only tables that have been COMPLETELY REPLACED in v2.
     We check whether they are actually old v1 tables before dropping
     by testing for a column that only existed in v1.
  3. create_all (called after this) creates any missing tables.

IMPORTANT: We never drop v2 tables (tickets, payment_transactions,
audit_logs, lottery_posts) unconditionally — that would wipe live data
on every deploy. We only drop them if they still have the OLD v1 schema.
"""
import logging
from sqlalchemy import text
from .database import SessionLocal

logger = logging.getLogger(__name__)


def _exec(db, sql: str, label: str = "") -> bool:
    try:
        db.execute(text(sql))
        db.commit()
        logger.info("Migration OK: %s", label or sql[:80])
        return True
    except Exception as exc:
        db.rollback()
        logger.debug("Migration skipped (%s): %s", type(exc).__name__, label or sql[:80])
        return False


def _column_exists(db, table: str, column: str) -> bool:
    """Return True if a column exists in a table (PostgreSQL)."""
    try:
        result = db.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ), {"t": table, "c": column}).fetchone()
        db.rollback()
        return result is not None
    except Exception:
        db.rollback()
        return False


def _table_exists(db, table: str) -> bool:
    try:
        result = db.execute(text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :t"
        ), {"t": table}).fetchone()
        db.rollback()
        return result is not None
    except Exception:
        db.rollback()
        return False


def run_migrations() -> None:
    db = SessionLocal()
    try:
        # ── 1. Add new columns to existing tables ─────────────────────────────
        _exec(db, "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)", "users.phone")

        # ── 2. Drop OLD v1 tables only if they still have v1-only columns ──────

        # v1 draws table had a 'server_seed' column; v2 replaced it with lottery_posts
        if _table_exists(db, "draws") and _column_exists(db, "draws", "server_seed"):
            _exec(db, "DROP TABLE IF EXISTS draws CASCADE", "drop v1 draws")

        # v1 wallets table: drop unconditionally (no v2 equivalent)
        if _table_exists(db, "wallets"):
            _exec(db, "DROP TABLE IF EXISTS wallets CASCADE", "drop v1 wallets")

        # v1 transactions table (different from v2 payment_transactions)
        if _table_exists(db, "transactions"):
            _exec(db, "DROP TABLE IF EXISTS transactions CASCADE", "drop v1 transactions")

        # v1 tickets table had a 'numbers' column (JSON array of ints for lottery numbers)
        # v2 tickets table has 'ticket_no' instead
        if _table_exists(db, "tickets") and _column_exists(db, "tickets", "numbers"):
            _exec(db, "DROP TABLE IF EXISTS tickets CASCADE", "drop v1 tickets (had 'numbers' column)")

        # v1 audit_logs had no 'entity' column; v2 added entity + entity_id + ip_address
        if _table_exists(db, "audit_logs") and not _column_exists(db, "audit_logs", "entity"):
            _exec(db, "DROP TABLE IF EXISTS audit_logs CASCADE", "drop v1 audit_logs (missing entity column)")

        # Leftover tables from early design iterations
        _exec(db, "DROP TABLE IF EXISTS lottery_events CASCADE", "drop lottery_events")

        # ── 3. Add missing columns to v2 tables that may have been created ─────
        #    before a model update was deployed
        if _table_exists(db, "payment_transactions"):
            _exec(db, "ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS webhook_payload JSONB",
                  "payment_transactions.webhook_payload")

        if _table_exists(db, "audit_logs"):
            _exec(db, "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(50)",
                  "audit_logs.entity")
            _exec(db, "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id INTEGER",
                  "audit_logs.entity_id")
            _exec(db, "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)",
                  "audit_logs.ip_address")

    finally:
        db.close()
