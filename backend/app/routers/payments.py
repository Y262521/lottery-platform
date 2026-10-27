"""Manual payment flow with screenshot proof upload."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..audit import log
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..media import upload_image
from ..models import (
    Gateway, LotteryPost, LotteryStatus,
    PaymentStatus, PaymentTransaction, Role, Ticket, TicketStatus, User,
)
from ..notifications import send_ticket_confirmation
from ..payments import generate_tickets
from ..schemas import PaymentOut
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])


class PaymentAccountsOut(BaseModel):
    telebirr_number: str
    telebirr_name: str
    cbe_number: str
    cbe_name: str
    awash_number: str
    awash_name: str


@router.get("/accounts", response_model=PaymentAccountsOut)
def payment_accounts():
    return PaymentAccountsOut(
        telebirr_number=settings.TELEBIRR_ACCOUNT,
        telebirr_name=settings.TELEBIRR_NAME,
        cbe_number=settings.CBE_ACCOUNT,
        cbe_name=settings.CBE_NAME,
        awash_number=settings.AWASH_ACCOUNT,
        awash_name=settings.AWASH_NAME,
    )


@router.get("/debug")
def debug_tables(db: Session = Depends(get_db)):
    """Debug: show all tables and columns in the DB."""
    from sqlalchemy import inspect
    try:
        inspector = inspect(db.bind)
        return {t: [c["name"] for c in inspector.get_columns(t)]
                for t in inspector.get_table_names()}
    except Exception as e:
        return {"error": str(e)}


@router.post("/submit", response_model=PaymentOut, status_code=201)
async def submit_payment(
    lottery_id: int = Form(...),
    quantity: int = Form(...),
    gateway: str = Form(...),
    payment_reference: str = Form(...),
    sender_name: str = Form(...),
    phone: str = Form(default=""),
    message: str = Form(default=""),
    screenshot: UploadFile = File(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate gateway
    try:
        gw = Gateway(gateway.upper())
    except ValueError:
        raise HTTPException(400, f"Invalid gateway. Use TELEBIRR or BANK_TRANSFER")

    lottery = db.get(LotteryPost, lottery_id)
    if not lottery or lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(400, "Lottery is not open for purchases")

    if lottery.total_tickets and (lottery.tickets_sold + quantity) > lottery.total_tickets:
        raise HTTPException(400, "Not enough tickets remaining")

    user_confirmed = db.scalar(
        select(func.count()).select_from(Ticket).where(
            Ticket.lottery_id == lottery_id,
            Ticket.user_id == user.id,
            Ticket.status == TicketStatus.CONFIRMED,
        )
    ) or 0
    if user_confirmed + quantity > lottery.max_per_user:
        raise HTTPException(400, f"Maximum {lottery.max_per_user} tickets per user")

    amount = round(lottery.ticket_price * quantity, 2)

    # Upload screenshot (non-blocking failure)
    screenshot_url = None
    if screenshot and screenshot.filename:
        try:
            content = await screenshot.read()
            screenshot_url = upload_image(
                content,
                folder="lottery/payment_proofs",
                public_id=f"proof_u{user.id}_l{lottery_id}_{int(datetime.now(timezone.utc).timestamp())}",
            )
        except Exception as exc:
            logger.warning("Screenshot upload failed (non-fatal): %s", exc)

    # Build transaction — everything in one try/except with proper rollback
    try:
        txn = PaymentTransaction(
            user_id=user.id,
            lottery_id=lottery_id,
            amount=amount,
            currency="ETB",
            gateway=gw,
            gateway_ref=payment_reference,
            gateway_status=PaymentStatus.PENDING,
            tickets_count=quantity,
            webhook_payload={
                "payment_reference": payment_reference,
                "sender_name": sender_name,
                "phone": phone or None,
                "message": message or None,
                "screenshot_url": screenshot_url,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(txn)
        db.flush()  # get txn.id — inside try so errors are caught
        log(db, "payment.submit", actor_id=user.id, entity="payment_transaction",
            entity_id=txn.id,
            detail=f"gateway={gw} ref={payment_reference} amount={amount}")
        db.commit()
        db.refresh(txn)
        return txn
    except Exception as exc:
        db.rollback()
        err_str = str(exc)
        logger.error("payment.submit failed: %s", err_str, exc_info=True)
        # Check for duplicate reference
        if "unique" in err_str.lower() or "duplicate" in err_str.lower():
            raise HTTPException(409, "This payment reference has already been submitted")
        raise HTTPException(500, f"Could not save payment: {err_str}")


@router.get("/mine", response_model=list[PaymentOut])
def my_payments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == user.id)
        .order_by(PaymentTransaction.created_at.desc())
    ).all()


@router.post("/{txn_id}/confirm", response_model=PaymentOut)
def confirm_payment(
    txn_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    txn = db.get(PaymentTransaction, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.gateway_status == PaymentStatus.SUCCESS:
        raise HTTPException(409, "Already confirmed")
    if txn.gateway_status == PaymentStatus.FAILED:
        raise HTTPException(409, "Payment was rejected")

    lottery = db.get(LotteryPost, txn.lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")

    if lottery.total_tickets and (lottery.tickets_sold + txn.tickets_count) > lottery.total_tickets:
        txn.gateway_status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(400, "Lottery is now full")

    try:
        txn.gateway_status = PaymentStatus.SUCCESS
        txn.verified_at = datetime.now(timezone.utc)
        user = db.get(User, txn.user_id)
        tickets = generate_tickets(db, lottery, user, txn, txn.tickets_count)
        log(db, "payment.confirmed", actor_id=admin.id, entity="payment_transaction",
            entity_id=txn_id, detail=f"tickets_count={txn.tickets_count}")
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("confirm_payment failed: %s", exc, exc_info=True)
        raise HTTPException(500, f"Confirmation failed: {exc}")

    ticket_nos = [t.ticket_no for t in tickets]
    send_ticket_confirmation(
        user.email, user.full_name, lottery.title,
        ticket_nos, lottery.draw_date.strftime("%Y-%m-%d"),
    )
    db.refresh(txn)
    return txn


@router.post("/{txn_id}/reject", response_model=PaymentOut)
def reject_payment(
    txn_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    txn = db.get(PaymentTransaction, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.gateway_status != PaymentStatus.PENDING:
        raise HTTPException(409, "Only PENDING payments can be rejected")
    txn.gateway_status = PaymentStatus.FAILED
    log(db, "payment.rejected", actor_id=admin.id, entity="payment_transaction", entity_id=txn_id)
    db.commit()
    db.refresh(txn)
    return txn
