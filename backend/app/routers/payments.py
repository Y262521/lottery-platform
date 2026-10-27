"""Payment initiation and ticket management."""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..audit import log
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Gateway, LotteryPost, LotteryStatus, PaymentTransaction, Role, Ticket, TicketStatus, User
from ..payments import chapa_initiate, telebirr_initiate
from ..schemas import PaymentInitiate, PaymentInitiateResponse, PaymentOut, TicketOut

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    payload: PaymentInitiate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lottery = db.get(LotteryPost, payload.lottery_id)
    if not lottery or lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(400, "Lottery is not open for purchases")

    # Capacity check (soft — webhook will hard-check with lock)
    if lottery.total_tickets and (lottery.tickets_sold + payload.quantity) > lottery.total_tickets:
        raise HTTPException(400, "Not enough tickets remaining")

    # Per-user limit check
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
    tx_ref = f"LP{lottery.id}-U{user.id}-{secrets.token_hex(6).upper()}"
    return_url = payload.return_url or f"{settings.FRONTEND_URL}/payment/callback"

    # Create pending transaction
    txn = PaymentTransaction(
        user_id=user.id,
        lottery_id=lottery.id,
        amount=amount,
        currency="ETB",
        gateway=payload.gateway,
        gateway_ref=tx_ref,
        tickets_count=payload.quantity,
    )
    db.add(txn)
    db.flush()
    log(db, "payment.initiate", actor_id=user.id, entity="payment_transaction",
        entity_id=txn.id, detail=f"gateway={payload.gateway} amount={amount}")
    db.commit()

    checkout_url = None
    ussd_push = False

    if payload.gateway == Gateway.CHAPA:
        try:
            checkout_url = chapa_initiate(
                amount, user.email, user.full_name, tx_ref, return_url, lottery.title
            )
        except Exception as e:
            raise HTTPException(502, f"Chapa error: {e}")

    elif payload.gateway == Gateway.TELEBIRR:
        phone = payload.phone or user.phone
        if not phone:
            raise HTTPException(400, "Phone number required for Telebirr")
        ussd_push = telebirr_initiate(amount, phone, tx_ref, lottery.title)

    elif payload.gateway == Gateway.BANK_TRANSFER:
        # Manual — admin confirms later; return bank details via tx_ref
        pass

    return PaymentInitiateResponse(
        transaction_id=txn.id,
        gateway_ref=tx_ref,
        checkout_url=checkout_url,
        ussd_push=ussd_push,
    )


@router.get("/mine", response_model=list[PaymentOut])
def my_payments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == user.id)
        .order_by(PaymentTransaction.created_at.desc())
    ).all()
    return rows


@router.post("/{txn_id}/confirm", response_model=PaymentOut)
def admin_confirm_payment(
    txn_id: int, db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Manually confirm a bank transfer payment."""
    from ..payments import _settle_transaction
    txn = db.get(PaymentTransaction, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.gateway != Gateway.BANK_TRANSFER:
        raise HTTPException(400, "Only bank transfer payments can be manually confirmed")
    _settle_transaction(db, txn, {"manual": True, "confirmed_by": admin.id})
    log(db, "payment.manual_confirm", actor_id=admin.id, entity="payment_transaction", entity_id=txn_id)
    db.refresh(txn)
    return txn
