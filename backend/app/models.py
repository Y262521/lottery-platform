"""SQLAlchemy ORM models for the lottery platform.

Entities:
  User          account + role (USER / ADMIN / AUDITOR)
  Wallet        1:1 with user, holds playable balance
  Draw          a scheduled lottery draw (lifecycle + commit-reveal fields)
  Ticket        a user's entry for a draw (numbers + status)
  Transaction   immutable wallet ledger entries
  AuditLog      append-only record of security-relevant actions
"""
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"


class DrawStatus(str, Enum):
    SCHEDULED = "SCHEDULED"      # created, sales open
    FROZEN = "FROZEN"            # sales closed, awaiting draw
    COMPLETED = "COMPLETED"      # winning numbers generated + revealed
    CANCELLED = "CANCELLED"


class TicketStatus(str, Enum):
    ACTIVE = "ACTIVE"            # valid entry for an upcoming draw
    WIN = "WIN"
    LOSE = "LOSE"
    REFUNDED = "REFUNDED"        # e.g. draw was cancelled


class TxnType(str, Enum):
    DEPOSIT = "DEPOSIT"
    TICKET_PURCHASE = "TICKET_PURCHASE"
    PAYOUT = "PAYOUT"
    REFUND = "REFUND"
    BONUS = "BONUS"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(SAEnum(Role), default=Role.USER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    wallet: Mapped["Wallet | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Stored as float for the demo; production should use Decimal/cents with strict rounding.
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="wallet")

    __table_args__ = (CheckConstraint("balance >= 0", name="ck_wallet_nonnegative"),)


class Draw(Base):
    __tablename__ = "draws"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[DrawStatus] = mapped_column(SAEnum(DrawStatus), default=DrawStatus.SCHEDULED, nullable=False)
    ticket_price: Mapped[float] = mapped_column(Float, nullable=False)
    jackpot: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Number selection config for this draw
    numbers_per_ticket: Mapped[int] = mapped_column(Integer, nullable=False)
    number_min: Mapped[int] = mapped_column(Integer, nullable=False)
    number_max: Mapped[int] = mapped_column(Integer, nullable=False)

    sales_open_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    sales_close_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    draw_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # --- Commit-reveal scheme (provable fairness) ---
    # server_seed is kept SECRET until reveal; only its hash is public during sales.
    server_seed: Mapped[str | None] = mapped_column(String(255), nullable=True)
    server_seed_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Client/community seed, captured at draw time (e.g. a future block hash).
    client_seed: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Nonce makes the combination unique per draw.
    nonce: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    winning_numbers: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tickets: Mapped[list["Ticket"]] = relationship(back_populates="draw")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    draw_id: Mapped[int] = mapped_column(ForeignKey("draws.id", ondelete="CASCADE"), nullable=False)
    numbers: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), default=TicketStatus.ACTIVE, nullable=False)
    matched_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prize: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="tickets")
    draw: Mapped["Draw"] = relationship(back_populates="tickets")


class Transaction(Base):
    """Immutable wallet ledger. Append-only: never update existing rows."""

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[TxnType] = mapped_column(SAEnum(TxnType), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # signed: +credit / -debit
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. ticket id
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class AuditLog(Base):
    """Append-only record of security/admin actions for regulatory audit."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
