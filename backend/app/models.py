"""ORM models for the direct-purchase lottery platform.

Entities:
  User                account + role
  LotteryPost         an event with prize, ticket price, media
  Ticket              a confirmed ticket belonging to a user+lottery
  PaymentTransaction  one payment attempt (Chapa / Telebirr / Bank)
  DrawResult          winning numbers + video proof published by admin
  AuditLog            append-only security/admin record
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, Enum as SAEnum,
    Float, ForeignKey, Integer, JSON, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class Role(str, Enum):
    USER    = "USER"
    ADMIN   = "ADMIN"
    AUDITOR = "AUDITOR"


class LotteryStatus(str, Enum):
    DRAFT     = "DRAFT"      # created, not yet visible to users
    ACTIVE    = "ACTIVE"     # sales open
    CLOSED    = "CLOSED"     # sales closed (manually or limit reached)
    DRAWN     = "DRAWN"      # results published
    CANCELLED = "CANCELLED"


class TicketStatus(str, Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"  # payment initiated, not confirmed
    CONFIRMED       = "CONFIRMED"        # payment verified, ticket valid
    CANCELLED       = "CANCELLED"        # payment failed / refunded
    WON             = "WON"
    LOST            = "LOST"


class Gateway(str, Enum):
    CHAPA         = "CHAPA"
    TELEBIRR      = "TELEBIRR"
    BANK_TRANSFER = "BANK_TRANSFER"


class PaymentStatus(str, Enum):
    PENDING  = "PENDING"
    SUCCESS  = "SUCCESS"
    FAILED   = "FAILED"
    REFUNDED = "REFUNDED"


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]      = mapped_column(Integer, primary_key=True)
    email:           Mapped[str]      = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name:       Mapped[str]      = mapped_column(String(255), nullable=False)
    phone:           Mapped[str|None] = mapped_column(String(30), nullable=True)
    hashed_password: Mapped[str]      = mapped_column(String(255), nullable=False)
    role:            Mapped[Role]     = mapped_column(SAEnum(Role), default=Role.USER, nullable=False)
    is_active:       Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)
    created_at:      Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tickets:      Mapped[list["Ticket"]]             = relationship(back_populates="user")
    transactions: Mapped[list["PaymentTransaction"]] = relationship(back_populates="user")


class LotteryPost(Base):
    __tablename__ = "lottery_posts"

    id:                Mapped[int]          = mapped_column(Integer, primary_key=True)
    title:             Mapped[str]          = mapped_column(String(255), nullable=False)
    description:       Mapped[str|None]     = mapped_column(Text, nullable=True)
    cover_image_url:   Mapped[str|None]     = mapped_column(String(500), nullable=True)
    prize_description: Mapped[str]          = mapped_column(Text, nullable=False)
    # list of Cloudinary image URLs for the prize
    prize_image_urls:  Mapped[list|None]    = mapped_column(JSON, nullable=True, default=list)
    ticket_price:      Mapped[float]        = mapped_column(Float, nullable=False)
    # None = unlimited (admin closes manually)
    total_tickets:     Mapped[int|None]     = mapped_column(Integer, nullable=True)
    tickets_sold:      Mapped[int]          = mapped_column(Integer, default=0, nullable=False)
    max_per_user:      Mapped[int]          = mapped_column(Integer, default=10, nullable=False)
    status:            Mapped[LotteryStatus]= mapped_column(SAEnum(LotteryStatus), default=LotteryStatus.DRAFT, nullable=False)
    sales_open_at:     Mapped[datetime|None]= mapped_column(DateTime, nullable=True)
    sales_close_at:    Mapped[datetime|None]= mapped_column(DateTime, nullable=True)
    draw_date:         Mapped[datetime]     = mapped_column(DateTime, nullable=False)
    created_by:        Mapped[int]          = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at:        Mapped[datetime]     = mapped_column(DateTime, server_default=func.now())

    tickets:     Mapped[list["Ticket"]]            = relationship(back_populates="lottery")
    draw_result: Mapped["DrawResult|None"]          = relationship(back_populates="lottery", uselist=False)
    transactions:Mapped[list["PaymentTransaction"]] = relationship(back_populates="lottery")

    __table_args__ = (
        CheckConstraint("ticket_price > 0", name="ck_positive_price"),
    )


class Ticket(Base):
    __tablename__ = "tickets"

    id:             Mapped[int]         = mapped_column(Integer, primary_key=True)
    ticket_no:      Mapped[str]         = mapped_column(String(50), unique=True, nullable=False, index=True)
    lottery_id:     Mapped[int]         = mapped_column(ForeignKey("lottery_posts.id"), nullable=False)
    user_id:        Mapped[int]         = mapped_column(ForeignKey("users.id"), nullable=False)
    status:         Mapped[TicketStatus]= mapped_column(SAEnum(TicketStatus), default=TicketStatus.PENDING_PAYMENT)
    payment_txn_id: Mapped[int|None]    = mapped_column(ForeignKey("payment_transactions.id"), nullable=True)
    created_at:     Mapped[datetime]    = mapped_column(DateTime, server_default=func.now())
    confirmed_at:   Mapped[datetime|None]= mapped_column(DateTime, nullable=True)

    user:    Mapped["User"]               = relationship(back_populates="tickets")
    lottery: Mapped["LotteryPost"]        = relationship(back_populates="tickets")
    payment: Mapped["PaymentTransaction|None"] = relationship(back_populates="tickets", foreign_keys=[payment_txn_id])


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id:              Mapped[int]          = mapped_column(Integer, primary_key=True)
    user_id:         Mapped[int]          = mapped_column(ForeignKey("users.id"), nullable=False)
    lottery_id:      Mapped[int]          = mapped_column(ForeignKey("lottery_posts.id"), nullable=False)
    amount:          Mapped[float]        = mapped_column(Float, nullable=False)
    currency:        Mapped[str]          = mapped_column(String(10), default="ETB", nullable=False)
    gateway:         Mapped[Gateway]      = mapped_column(SAEnum(Gateway), nullable=False)
    gateway_ref:     Mapped[str|None]     = mapped_column(String(255), unique=True, nullable=True, index=True)
    gateway_status:  Mapped[PaymentStatus]= mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    # raw webhook payload for audit
    webhook_payload: Mapped[dict|None]    = mapped_column(JSON, nullable=True)
    tickets_count:   Mapped[int]          = mapped_column(Integer, nullable=False)
    created_at:      Mapped[datetime]     = mapped_column(DateTime, server_default=func.now())
    verified_at:     Mapped[datetime|None]= mapped_column(DateTime, nullable=True)

    user:    Mapped["User"]        = relationship(back_populates="transactions")
    lottery: Mapped["LotteryPost"] = relationship(back_populates="transactions")
    tickets: Mapped[list["Ticket"]]= relationship(back_populates="payment", foreign_keys=[Ticket.payment_txn_id])


class DrawResult(Base):
    __tablename__ = "draw_results"

    id:                 Mapped[int]      = mapped_column(Integer, primary_key=True)
    lottery_id:         Mapped[int]      = mapped_column(ForeignKey("lottery_posts.id"), unique=True, nullable=False)
    # e.g. ["LP001-0042", "LP001-0107"]
    winning_ticket_nos: Mapped[list]     = mapped_column(JSON, nullable=False)
    draw_video_url:     Mapped[str|None] = mapped_column(String(500), nullable=True)
    proof_image_urls:   Mapped[list|None]= mapped_column(JSON, nullable=True, default=list)
    notes:              Mapped[str|None] = mapped_column(Text, nullable=True)
    published_at:       Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    published_by:       Mapped[int]      = mapped_column(ForeignKey("users.id"), nullable=False)

    lottery: Mapped["LotteryPost"] = relationship(back_populates="draw_result")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    actor_id:   Mapped[int|None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action:     Mapped[str]      = mapped_column(String(100), nullable=False)
    entity:     Mapped[str|None] = mapped_column(String(50), nullable=True)
    entity_id:  Mapped[int|None] = mapped_column(Integer, nullable=True)
    detail:     Mapped[str|None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str|None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
