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
    Gateway, LotteryPost, LotteryStatus, PaymentAccount,
    PaymentStatus, PaymentTransaction, Role, Ticket, TicketStatus, User,
)
from ..notifications import send_ticket_confirmation
from ..payments import generate_tickets
from ..schemas import PaymentOut
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])


class PaymentAccountItem(BaseModel):
    id: int
    provider_type: str
    provider_id: str
    provider_name: str
    account_number: str
    account_holder: str
    instructions: str | None = None


class PaymentAccountsOut(BaseModel):
    telebirr_number: str
    telebirr_name: str
    mpesa_number: str
    mpesa_name: str
    cbe_number: str
    cbe_name: str
    awash_number: str
    awash_name: str
    by_provider: dict[str, dict] = {}
    accounts: list[PaymentAccountItem] = []


@router.get("/accounts", response_model=PaymentAccountsOut)
def payment_accounts(db: Session = Depends(get_db)):
    accts = db.scalars(select(PaymentAccount).where(PaymentAccount.is_active == True)).all()
    by_prov = {
        a.provider_id: {
            "id": a.id,
            "provider_type": a.provider_type,
            "provider_id": a.provider_id,
            "provider_name": a.provider_name,
            "account_number": a.account_number,
            "account_holder": a.account_holder,
            "instructions": a.instructions,
        }
        for a in accts
    }

    t_num = by_prov.get("TELEBIRR", {}).get("account_number") or settings.TELEBIRR_ACCOUNT
    t_name = by_prov.get("TELEBIRR", {}).get("account_holder") or settings.TELEBIRR_NAME or "Yona Online Draw"
    m_num = by_prov.get("MPESA", {}).get("account_number") or settings.MPESA_ACCOUNT
    m_name = by_prov.get("MPESA", {}).get("account_holder") or settings.MPESA_NAME or "Yona Online Draw"
    c_num = by_prov.get("CBE", {}).get("account_number") or settings.CBE_ACCOUNT
    c_name = by_prov.get("CBE", {}).get("account_holder") or settings.CBE_NAME or "Yona Online Draw"
    a_num = by_prov.get("AWASH", {}).get("account_number") or settings.AWASH_ACCOUNT
    a_name = by_prov.get("AWASH", {}).get("account_holder") or settings.AWASH_NAME or "Yona Online Draw"

    return PaymentAccountsOut(
        telebirr_number=t_num,
        telebirr_name=t_name,
        mpesa_number=m_num,
        mpesa_name=m_name,
        cbe_number=c_num,
        cbe_name=c_name,
        awash_number=a_num,
        awash_name=a_name,
        by_provider=by_prov,
        accounts=[
            PaymentAccountItem(
                id=a.id,
                provider_type=a.provider_type,
                provider_id=a.provider_id,
                provider_name=a.provider_name,
                account_number=a.account_number,
                account_holder=a.account_holder,
                instructions=a.instructions,
            )
            for a in accts
        ],
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
    chosen_numbers: str = Form(default=""),  # comma-separated e.g. "42,17"
    bank_or_wallet: str = Form(default=""),  # specific bank or wallet name
    screenshot: UploadFile = File(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate gateway
    gw_str = gateway.upper().strip()
    try:
        gw = Gateway(gw_str)
    except ValueError:
        if "BANK" in gw_str:
            gw = Gateway.BANK_TRANSFER
        elif "MPESA" in gw_str or "M-PESA" in gw_str:
            gw = Gateway.MPESA
        elif "DIGITAL" in gw_str or "WALLET" in gw_str:
            gw = Gateway.DIGITAL_WALLET
        elif "TELE" in gw_str:
            gw = Gateway.TELEBIRR
        else:
            gw = Gateway.MANUAL

    lottery = db.get(LotteryPost, lottery_id)
    if not lottery or lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(400, "Lottery is not open for purchases")

    if lottery.total_tickets and (lottery.tickets_sold + quantity) > lottery.total_tickets:
        raise HTTPException(400, "Not enough tickets remaining")

    # Note: max tickets per user check removed — users can purchase all tickets up to total availability

    # Parse and validate chosen numbers
    chosen_list = []
    if chosen_numbers:
        try:
            chosen_list = [int(x.strip()) for x in chosen_numbers.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(400, "Invalid chosen numbers format")

    # Check chosen numbers are available
    if chosen_list:
        from sqlalchemy import select as _select
        from ..models import Ticket as _T, TicketStatus as _TS
        taken = db.scalars(
            _select(_T.chosen_number).where(
                _T.lottery_id == lottery_id,
                _T.chosen_number.in_(chosen_list),
                _T.status.in_([_TS.PENDING_PAYMENT, _TS.CONFIRMED, _TS.WON, _TS.LOST])
            )
        ).all()
        if taken:
            taken_str = ", ".join(str(n) for n in taken)
            raise HTTPException(
                409,
                f"ቀደም ብሎ ተወስዷል / Already taken: {taken_str}"
            )

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
                "chosen_numbers": chosen_list or None,
                "provider": bank_or_wallet or gw.value,
                "bank_or_wallet": bank_or_wallet or gw.value,
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
    if user.email:
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
