"""Manual payment flow.

Users pay directly to the admin's bank/Telebirr account, then submit their
payment reference. Admin reviews and confirms — tickets are issued on confirm.
No third-party payment API is called.
"""
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..audit import log
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import (
    Gateway, LotteryPost, LotteryStatus,
    PaymentStatus, PaymentTransaction, Role, Ticket, TicketStatus, User,
)
from ..notifications import send_ticket_confirmation
from ..payments import generate_tickets
from ..schemas import PaymentOut

router = APIRouter(prefix="/api/payments", tags=["payments"])


# ── Request / response schemas ────────────────────────────────────────────────

class ManualPaymentRequest(BaseModel):
    lottery_id: int
    quantity: int
    gateway: Gateway          # TELEBIRR or BANK_TRANSFER
    payment_reference: str    # user-supplied: Telebirr TxRef or bank slip number
    sender_name: str          # user's name as it appears on the transfer
    phone: str | None = None


class PaymentAccountsOut(BaseModel):
    telebirr_number: str
    telebirr_name: str
    cbe_number: str
    cbe_name: str
    awash_number: str
    awash_name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=PaymentAccountsOut)
def payment_accounts():
    """Return the admin's payment account details shown on the checkout page."""
    return PaymentAccountsOut(
        telebirr_number=settings.TELEBIRR_ACCOUNT,
        telebirr_name=settings.TELEBIRR_NAME,
        cbe_number=settings.CBE_ACCOUNT,
        cbe_name=settings.CBE_NAME,
        awash_number=settings.AWASH_ACCOUNT,
        awash_name=settings.AWASH_NAME,
    )


@router.post("/submit", response_model=PaymentOut, status_code=201)
def submit_payment(
    payload: ManualPaymentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """User submits their payment reference after manually transferring money.
    Tickets remain PENDING until admin confirms the payment.
    """
    lottery = db.get(LotteryPost, payload.lottery_id)
    if not lottery or lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(400, "Lottery is not open for purchases")

    # Capacity check
    if lottery.total_tickets and (lottery.tickets_sold + payload.quantity) > lottery.total_tickets:
        raise HTTPException(400, "Not enough tickets remaining")

    # Per-user limit
    user_confirmed = db.scalar(
        select(func.count()).select_from(Ticket).where(
            Ticket.lottery_id == payload.lottery_id,
            Ticket.user_id == user.id,
            Ticket.status == TicketStatus.CONFIRMED,
        )
    ) or 0
    if user_confirmed + payload.quantity > lottery.max_per_user:
        raise HTTPException(400, f"Maximum {lottery.max_per_user} tickets per user")

    amount = round(lottery.ticket_price * payload.quantity, 2)

    # Create a PENDING transaction with the user's reference
    txn = PaymentTransaction(
        user_id=user.id,
        lottery_id=lottery.id,
        amount=amount,
        currency="ETB",
        gateway=payload.gateway,
        gateway_ref=payload.payment_reference,
        gateway_status=PaymentStatus.PENDING,
        tickets_count=payload.quantity,
        webhook_payload={
            "payment_reference": payload.payment_reference,
            "sender_name": payload.sender_name,
            "phone": payload.phone,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(txn)
    db.flush()
    log(db, "payment.submit", actor_id=user.id, entity="payment_transaction",
        entity_id=txn.id,
        detail=f"gateway={payload.gateway} ref={payload.payment_reference} amount={amount}")
    db.commit()
    db.refresh(txn)
    return txn


@router.get("/mine", response_model=list[PaymentOut])
def my_payments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == user.id)
        .order_by(PaymentTransaction.created_at.desc())
    ).all()
    return rows


@router.post("/{txn_id}/confirm", response_model=PaymentOut)
def confirm_payment(
    txn_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Admin confirms a manual payment — tickets are generated immediately."""
    txn = db.get(PaymentTransaction, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.gateway_status == PaymentStatus.SUCCESS:
        raise HTTPException(409, "Payment already confirmed")
    if txn.gateway_status == PaymentStatus.FAILED:
        raise HTTPException(409, "Payment was rejected — cannot confirm")

    # Lock lottery row and generate tickets
    lottery = db.get(LotteryPost, txn.lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")

    # Final capacity check under lock
    if lottery.total_tickets and (lottery.tickets_sold + txn.tickets_count) > lottery.total_tickets:
        txn.gateway_status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(400, "Lottery is now full — cannot confirm")

    txn.gateway_status = PaymentStatus.SUCCESS
    txn.verified_at = datetime.now(timezone.utc)

    user = db.get(User, txn.user_id)
    tickets = generate_tickets(db, lottery, user, txn, txn.tickets_count)
    db.commit()

    ticket_nos = [t.ticket_no for t in tickets]
    send_ticket_confirmation(
        user.email, user.full_name, lottery.title,
        ticket_nos, lottery.draw_date.strftime("%Y-%m-%d"),
    )

    log(db, "payment.confirmed", actor_id=admin.id, entity="payment_transaction",
        entity_id=txn_id, detail=f"tickets={ticket_nos}")
    db.commit()
    db.refresh(txn)
    return txn


@router.post("/{txn_id}/reject", response_model=PaymentOut)
def reject_payment(
    txn_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Admin rejects a fraudulent or unverifiable payment."""
    txn = db.get(PaymentTransaction, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.gateway_status != PaymentStatus.PENDING:
        raise HTTPException(409, "Only PENDING payments can be rejected")
    txn.gateway_status = PaymentStatus.FAILED
    log(db, "payment.rejected", actor_id=admin.id, entity="payment_transaction",
        entity_id=txn_id)
    db.commit()
    db.refresh(txn)
    return txn
