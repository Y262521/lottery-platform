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
from ..payments import allocate_ticket_numbers, generate_tickets
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
    payment_reference: str = Form(default=""),
    sender_name: str = Form(...),
    phone: str = Form(default=""),
    message: str = Form(default=""),
    chosen_numbers: str = Form(default=""),  # comma-separated e.g. "42,17"
    bank_or_wallet: str = Form(default=""),  # specific bank or wallet name
    screenshot: UploadFile = File(...),      # Mandatory payment screenshot proof
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate screenshot proof is uploaded and not empty
    if not screenshot or not screenshot.filename:
        raise HTTPException(
            400,
            "የክፍያ ማረጋገጫ ፎቶ (screenshot) ማስገባት ግዴታ ነው / Payment screenshot proof is required"
        )

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
        raise HTTPException(400, "ይህ ዕጣ ለሽያጭ ክፍት አይደለም / Draw is not open for ticket purchases")

    if lottery.total_tickets and (lottery.tickets_sold + quantity) > lottery.total_tickets:
        raise HTTPException(400, "በቂ ቀሪ ቲኬቶች የሉም / Not enough tickets remaining")

    # Clean payment reference (optional)
    ref_clean = payment_reference.strip() if payment_reference else ""
    if ref_clean:
        existing_ref = db.scalar(
            select(PaymentTransaction).where(PaymentTransaction.gateway_ref == ref_clean)
        )
        if existing_ref:
            raise HTTPException(
                409,
                "ይህ የማጣቀሻ ቁጥር አስቀድሞ ተመዝግቧል / This payment reference has already been submitted"
            )

    gateway_ref_val = ref_clean if ref_clean else None

    # Parse and validate chosen numbers
    chosen_list = []
    if chosen_numbers:
        try:
            chosen_list = [int(x.strip()) for x in chosen_numbers.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(400, "የተመረጡት ቁጥሮች አቀማመጥ የተሳሳተ ነው / Invalid chosen numbers format")

    if chosen_list:
        # Check for duplicates within the user's selected list
        if len(chosen_list) != len(set(chosen_list)):
            raise HTTPException(400, "በአንድ ግዢ ውስጥ ተመሳሳይ ቁጥሮች ተመርጠዋል / Duplicate draw numbers selected in the same purchase")

        # Range verification if lottery defines min or max
        if lottery.ticket_number_min is not None and any(n < lottery.ticket_number_min for n in chosen_list):
            raise HTTPException(400, f"የተመረጡት ቁጥሮች ቢያንስ {lottery.ticket_number_min} መሆን አለባቸው / Selected numbers must be at least {lottery.ticket_number_min}")
        if lottery.ticket_number_max is not None and any(n > lottery.ticket_number_max for n in chosen_list):
            raise HTTPException(400, f"የተመረጡት ቁጥሮች ከ {lottery.ticket_number_max} መብለጥ የለባቸውም / Selected numbers cannot exceed {lottery.ticket_number_max}")

        # Check against existing Ticket records (CONFIRMED, PENDING_PAYMENT, WON, LOST)
        taken_tickets = db.scalars(
            select(Ticket.chosen_number).where(
                Ticket.lottery_id == lottery_id,
                Ticket.chosen_number.in_(chosen_list),
                Ticket.status.in_([
                    TicketStatus.PENDING_PAYMENT,
                    TicketStatus.CONFIRMED,
                    TicketStatus.WON,
                    TicketStatus.LOST,
                ])
            )
        ).all()
        taken_pending_set = set(taken_tickets)

        # ALSO check pending transactions webhook payloads to ensure complete lock
        pending_txs = db.scalars(
            select(PaymentTransaction).where(
                PaymentTransaction.lottery_id == lottery_id,
                PaymentTransaction.gateway_status == PaymentStatus.PENDING,
            )
        ).all()
        for p_tx in pending_txs:
            if p_tx.webhook_payload and isinstance(p_tx.webhook_payload, dict):
                for num in p_tx.webhook_payload.get("chosen_numbers") or []:
                    if num in chosen_list:
                        taken_pending_set.add(num)

        if taken_pending_set:
            taken_str = ", ".join(str(n) for n in sorted(taken_pending_set))
            raise HTTPException(
                409,
                f"ቀደም ብሎ ተወስዷል ወይም በክፍያ ሂደት ላይ ነው / Draw number(s) already taken or payment in progress: {taken_str}"
            )

    amount = round(lottery.ticket_price * quantity, 2)

    # Read and upload screenshot proof
    try:
        content = await screenshot.read()
        if not content or len(content) == 0:
            raise HTTPException(
                400,
                "የክፍያ ማረጋገጫ ፎቶ ባዶ ነው / Payment screenshot file is empty"
            )
        screenshot_url = upload_image(
            content,
            folder="lottery/payment_proofs",
            public_id=f"proof_u{user.id}_l{lottery_id}_{int(datetime.now(timezone.utc).timestamp())}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Screenshot upload failed: %s", exc, exc_info=True)
        raise HTTPException(
            500,
            f"የስክሪንሾት ምስል ማስቀመጥ አልተቻለም / Failed to save screenshot: {exc}"
        )

    if not screenshot_url:
        raise HTTPException(
            500,
            "የስክሪንሾት ምስል ማስቀመጥ አልተቻለም / Failed to upload payment screenshot proof"
        )

    # Build transaction and reserve tickets in PENDING_PAYMENT status
    try:
        txn = PaymentTransaction(
            user_id=user.id,
            lottery_id=lottery_id,
            amount=amount,
            currency="ETB",
            gateway=gw,
            gateway_ref=gateway_ref_val,
            gateway_status=PaymentStatus.PENDING,
            tickets_count=quantity,
            webhook_payload={
                "payment_reference": ref_clean or None,
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
        db.flush()  # get txn.id

        # Immediately reserve tickets in PENDING_PAYMENT status
        for i in range(quantity):
            chosen = chosen_list[i] if i < len(chosen_list) else None
            pending_ticket = Ticket(
                ticket_no=f"LP{lottery.id:03d}-PENDING-{txn.id}-{i+1}",
                chosen_number=chosen,
                lottery_id=lottery.id,
                user_id=user.id,
                status=TicketStatus.PENDING_PAYMENT,
                payment_txn_id=txn.id,
            )
            db.add(pending_ticket)

        log(db, "payment.submit", actor_id=user.id, entity="payment_transaction",
            entity_id=txn.id,
            detail=f"gateway={gw} ref={ref_clean or 'N/A'} amount={amount} chosen={chosen_list}")
        db.commit()
        db.refresh(txn)
        return txn
    except Exception as exc:
        db.rollback()
        err_str = str(exc)
        logger.error("payment.submit failed: %s", err_str, exc_info=True)
        if "unique" in err_str.lower() or "duplicate" in err_str.lower():
            raise HTTPException(409, "ይህ የማጣቀሻ ቁጥር አስቀድሞ ተመዝግቧል / This payment reference has already been submitted")
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
        raise HTTPException(404, "የክፍያ መረጃው አልተገኘም / Payment transaction not found")
    if txn.gateway_status == PaymentStatus.SUCCESS:
        raise HTTPException(409, "ይህ ክፍያ አስቀድሞ ተረጋግጧል / Payment is already confirmed")
    if txn.gateway_status == PaymentStatus.FAILED:
        raise HTTPException(409, "ይህ ክፍያ ውድቅ ተደርጓል / Payment was rejected")

    lottery = db.get(LotteryPost, txn.lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")

    if lottery.total_tickets and (lottery.tickets_sold + txn.tickets_count) > lottery.total_tickets:
        txn.gateway_status = PaymentStatus.FAILED
        # Cancel any pending tickets
        existing_tickets = db.scalars(
            select(Ticket).where(Ticket.payment_txn_id == txn.id)
        ).all()
        for t in existing_tickets:
            t.status = TicketStatus.CANCELLED
            if "-PENDING-" not in t.ticket_no and "-CANCELLED" not in t.ticket_no:
                t.ticket_no = f"{t.ticket_no}-CANCELLED-{t.id}"
        db.commit()
        raise HTTPException(400, "ዕጣው ሙሉ በሙሉ ተጠናቋል / Draw is now full")

    try:
        txn.gateway_status = PaymentStatus.SUCCESS
        txn.verified_at = datetime.now(timezone.utc)
        user = db.get(User, txn.user_id)

        # Check if tickets were reserved at submit time
        existing_tickets = db.scalars(
            select(Ticket).where(Ticket.payment_txn_id == txn.id).order_by(Ticket.id)
        ).all()

        confirmed_tickets = []
        if existing_tickets:
            ticket_nos = allocate_ticket_numbers(db, lottery, len(existing_tickets))
            for t, t_no in zip(existing_tickets, ticket_nos):
                t.ticket_no = t_no
                t.status = TicketStatus.CONFIRMED
                t.confirmed_at = datetime.now(timezone.utc)
                confirmed_tickets.append(t)
        else:
            # Fallback for legacy transactions without pre-created tickets
            confirmed_tickets = generate_tickets(db, lottery, user, txn, txn.tickets_count)

        db.flush()
        actual_sold = db.scalar(
            select(func.count()).select_from(Ticket).where(
                Ticket.lottery_id == lottery.id,
                Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
            )
        ) or 0
        lottery.tickets_sold = actual_sold

        log(db, "payment.confirmed", actor_id=admin.id, entity="payment_transaction",
            entity_id=txn_id, detail=f"tickets_count={txn.tickets_count}")
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("confirm_payment failed: %s", exc, exc_info=True)
        raise HTTPException(500, f"ክፍያ ማረጋገጥ አልተቻለም / Confirmation failed: {exc}")

    ticket_nos = [t.ticket_no for t in confirmed_tickets]
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
        raise HTTPException(404, "የክፍያ መረጃው አልተገኘም / Payment transaction not found")
    if txn.gateway_status != PaymentStatus.PENDING:
        raise HTTPException(409, "በሂደት ላይ ያሉ ክፍያዎችን ብቻ ውድቅ ማድረግ ይቻላል / Only pending payments can be rejected")
    
    txn.gateway_status = PaymentStatus.FAILED

    # Release any reserved tickets so the numbers become available again for other users!
    existing_tickets = db.scalars(
        select(Ticket).where(Ticket.payment_txn_id == txn.id)
    ).all()
    for t in existing_tickets:
        t.status = TicketStatus.CANCELLED
        if "-PENDING-" not in t.ticket_no and "-CANCELLED" not in t.ticket_no:
            t.ticket_no = f"{t.ticket_no}-CANCELLED-{t.id}"

    # Sync lottery.tickets_sold to exact confirmed count
    lottery = db.get(LotteryPost, txn.lottery_id)
    if lottery:
        actual_sold = db.scalar(
            select(func.count()).select_from(Ticket).where(
                Ticket.lottery_id == lottery.id,
                Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
            )
        ) or 0
        lottery.tickets_sold = actual_sold

    log(db, "payment.rejected", actor_id=admin.id, entity="payment_transaction", entity_id=txn_id)
    db.commit()
    db.refresh(txn)
    return txn
