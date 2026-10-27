"""Pydantic request/response schemas (validation + serialization)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, conlist, field_validator

from .config import settings
from .models import DrawStatus, Role, TicketStatus, TxnType


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Literal[Role.USER] = Role.USER  # self-registration only ever USER


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
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


# --------------------------------------------------------------------------- #
# Wallet
# --------------------------------------------------------------------------- #
class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    balance: float
    updated_at: datetime


class DepositRequest(BaseModel):
    amount: float = Field(gt=0, le=100000)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TxnType
    amount: float
    balance_after: float
    reference: str | None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Draws
# --------------------------------------------------------------------------- #
class DrawCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    ticket_price: float = Field(gt=0)
    jackpot: float = Field(default=0, ge=0)
    numbers_per_ticket: int = Field(default=settings.NUMBERS_PER_TICKET, ge=1, le=10)
    number_min: int = Field(default=settings.NUMBER_RANGE_MIN, ge=0)
    number_max: int = Field(default=settings.NUMBER_RANGE_MAX, ge=1)
    sales_close_at: datetime
    draw_at: datetime

    @field_validator("number_max")
    @classmethod
    def range_valid(cls, v, info):
        mn = info.data.get("number_min")
        npt = info.data.get("numbers_per_ticket")
        if mn is not None and v <= mn:
            raise ValueError("number_max must be greater than number_min")
        # need enough distinct numbers in range
        if mn is not None and npt is not None and (v - mn) + 1 < npt:
            raise ValueError("number range too small for numbers_per_ticket")
        return v

    @field_validator("draw_at")
    @classmethod
    def draw_after_close(cls, v, info):
        close = info.data.get("sales_close_at")
        if close is not None and v <= close:
            raise ValueError("draw_at must be after sales_close_at")
        return v


class DrawOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    status: DrawStatus
    ticket_price: float
    jackpot: float
    numbers_per_ticket: int
    number_min: int
    number_max: int
    sales_open_at: datetime
    sales_close_at: datetime
    draw_at: datetime
    # server_seed stays hidden until reveal; only the hash is exposed
    server_seed_hash: str | None
    winning_numbers: list[int] | None
    created_at: datetime
    completed_at: datetime | None
    ticket_count: int = 0


class DrawRevealOut(BaseModel):
    """Full reveal bundle so a user can cryptographically verify a completed draw."""
    id: int
    server_seed: str
    server_seed_hash: str
    client_seed: str | None
    nonce: int
    winning_numbers: list[int]


# --------------------------------------------------------------------------- #
# Tickets
# --------------------------------------------------------------------------- #
class TicketCreate(BaseModel):
    draw_id: int
    numbers: conlist(int, min_length=1, max_length=10)

    @field_validator("numbers")
    @classmethod
    def validate_numbers(cls, v):
        if len(set(v)) != len(v):
            raise ValueError("numbers must be unique")
        return sorted(v)


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    draw_id: int
    numbers: list[int]
    status: TicketStatus
    matched_count: int | None
    prize: float
    purchased_at: datetime


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #
class AdminUpdateUser(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


class AdminAuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int | None
    action: str
    detail: str | None
    created_at: datetime
