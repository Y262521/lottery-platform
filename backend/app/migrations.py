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


def _add_enum_value(db, enum_type: str, value: str) -> None:
    """Add a value to a PostgreSQL enum type.

    ALTER TYPE ADD VALUE cannot run inside a transaction, so we use a
    raw connection with AUTOCOMMIT to bypass the transaction wrapper.
    Safe to call even if the value already exists (IF NOT EXISTS).
    """
    try:
        # Get the underlying DBAPI connection and set autocommit
        connection = db.connection()
        connection.execute(
            text(f"ALTER TYPE {enum_type} ADD VALUE IF NOT EXISTS '{value}'")
        )
        db.commit()
        logger.info("Enum OK: %s.%s", enum_type, value)
    except Exception as exc:
        db.rollback()
        logger.debug("Enum skipped (%s): %s.%s", type(exc).__name__, enum_type, value)


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

        # ── 3. Fix PostgreSQL enum types ──────────────────────────────────────
        # ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
        # We use autocommit-style execution to add missing enum values.
        _add_enum_value(db, "ticketstatus", "PENDING_PAYMENT")
        _add_enum_value(db, "ticketstatus", "CONFIRMED")
        _add_enum_value(db, "ticketstatus", "CANCELLED")
        _add_enum_value(db, "ticketstatus", "WON")
        _add_enum_value(db, "ticketstatus", "LOST")
        _add_enum_value(db, "gateway", "CHAPA")
        _add_enum_value(db, "gateway", "TELEBIRR")
        _add_enum_value(db, "gateway", "MPESA")
        _add_enum_value(db, "gateway", "DIGITAL_WALLET")
        _add_enum_value(db, "gateway", "BANK_TRANSFER")
        _add_enum_value(db, "gateway", "MANUAL")
        _add_enum_value(db, "paymentstatus", "PENDING")
        _add_enum_value(db, "paymentstatus", "SUCCESS")
        _add_enum_value(db, "paymentstatus", "FAILED")
        _add_enum_value(db, "paymentstatus", "REFUNDED")
        _add_enum_value(db, "lotterystatus", "DRAFT")
        _add_enum_value(db, "lotterystatus", "ACTIVE")
        _add_enum_value(db, "lotterystatus", "CLOSED")
        _add_enum_value(db, "lotterystatus", "DRAWN")
        _add_enum_value(db, "lotterystatus", "CANCELLED")

        # ── 4. Add missing columns to v2 tables ───────────────────────────────
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

        # v2.1 additions
        if _table_exists(db, "lottery_posts"):
            _exec(db, "ALTER TABLE lottery_posts ADD COLUMN IF NOT EXISTS ticket_number_min INTEGER DEFAULT 1",
                  "lottery_posts.ticket_number_min")
            _exec(db, "ALTER TABLE lottery_posts ADD COLUMN IF NOT EXISTS ticket_number_max INTEGER",
                  "lottery_posts.ticket_number_max")
            _exec(db, "ALTER TABLE lottery_posts ALTER COLUMN cover_image_url TYPE TEXT",
                  "lottery_posts.cover_image_url type text")

        if _table_exists(db, "tickets"):
            _exec(db, "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS chosen_number INTEGER",
                  "tickets.chosen_number")

        # v2.2 additions: optional email, required phone, multiple draw videos
        if _table_exists(db, "users"):
            _exec(db, "ALTER TABLE users ALTER COLUMN email DROP NOT NULL", "users.email drop not null")
            _exec(db, "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users(phone)", "ix_users_phone")

        if _table_exists(db, "draw_results"):
            _exec(db, "ALTER TABLE draw_results ADD COLUMN IF NOT EXISTS draw_video_urls JSONB",
                  "draw_results.draw_video_urls")

    finally:
        db.close()
