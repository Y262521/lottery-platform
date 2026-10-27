"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from .models import Gateway, LotteryStatus, PaymentStatus, Role, TicketStatus


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    phone: str | None
    role: Role
    is_active: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Lottery Posts ─────────────────────────────────────────────────────────────
class LotteryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    prize_description: str = Field(min_length=1)
    ticket_price: float = Field(gt=0)
    total_tickets: int | None = Field(default=None, gt=0)
    max_per_user: int = Field(default=10, ge=1)
    draw_date: datetime
    sales_open_at: datetime | None = None
    sales_close_at: datetime | None = None
    # Optional ticket number range for user selection
    ticket_number_min: int | None = Field(default=1, ge=1)
    ticket_number_max: int | None = Field(default=None, ge=1)


class LotteryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    prize_description: str | None = None
    ticket_price: float | None = Field(default=None, gt=0)
    total_tickets: int | None = Field(default=None, gt=0)
    max_per_user: int | None = Field(default=None, ge=1)
    draw_date: datetime | None = None
    sales_open_at: datetime | None = None
    sales_close_at: datetime | None = None


class LotteryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    cover_image_url: str | None
    prize_description: str
    prize_image_urls: list | None
    ticket_price: float
    total_tickets: int | None
    tickets_sold: int
    max_per_user: int
    status: LotteryStatus
    draw_date: datetime
    sales_open_at: datetime | None
    sales_close_at: datetime | None
    created_at: datetime
    ticket_number_min: int | None
    ticket_number_max: int | None


# ── Tickets ───────────────────────────────────────────────────────────────────
class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticket_no: str
    chosen_number: int | None
    lottery_id: int
    status: TicketStatus
    created_at: datetime
    confirmed_at: datetime | None


# ── Payments ──────────────────────────────────────────────────────────────────
class PaymentInitiate(BaseModel):
    lottery_id: int
    quantity: int = Field(ge=1, le=50)
    gateway: Gateway
    phone: str | None = None           # required for Telebirr
    return_url: str | None = None      # optional override


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lottery_id: int
    amount: float
    currency: str
    gateway: Gateway
    gateway_ref: str | None
    gateway_status: PaymentStatus
    tickets_count: int
    created_at: datetime
    verified_at: datetime | None


class PaymentInitiateResponse(BaseModel):
    transaction_id: int
    gateway_ref: str
    checkout_url: str | None    # Chapa hosted page URL
    ussd_push: bool             # True if Telebirr USSD was triggered


# ── Draw Results ──────────────────────────────────────────────────────────────
class DrawResultCreate(BaseModel):
    winning_ticket_nos: list[str] = Field(min_length=1)
    notes: str | None = None


class DrawResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lottery_id: int
    winning_ticket_nos: list
    draw_video_url: str | None
    proof_image_urls: list | None
    notes: str | None
    published_at: datetime


# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminUserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_id: int | None
    action: str
    entity: str | None
    entity_id: int | None
    detail: str | None
    created_at: datetime
