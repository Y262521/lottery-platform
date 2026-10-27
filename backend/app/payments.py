"""Payment gateway integrations: Chapa and Telebirr."""
import hashlib
import hmac
import secrets
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Gateway, LotteryPost, PaymentStatus, PaymentTransaction, Ticket, TicketStatus, User
from .notifications import send_ticket_confirmation

logger = logging.getLogger(__name__)


# ── Ticket number generation (concurrency-safe) ───────────────────────────────

def generate_tickets(
    db: Session,
    lottery: LotteryPost,
    user: User,
    txn: PaymentTransaction,
    quantity: int,
) -> list[Ticket]:
    """Generate unique ticket numbers inside the caller's transaction.

    The lottery row must already be locked with SELECT ... FOR UPDATE
    (or equivalent) before calling this function.
    """
    tickets = []
    for _ in range(quantity):
        seq = lottery.tickets_sold + len(tickets) + 1
        ticket_no = f"LP{lottery.id:03d}-{seq:05d}"
        t = Ticket(
            ticket_no=ticket_no,
            lottery_id=lottery.id,
            user_id=user.id,
            status=TicketStatus.CONFIRMED,
            payment_txn_id=txn.id,
            confirmed_at=datetime.now(timezone.utc),
        )
        db.add(t)
        tickets.append(t)
    lottery.tickets_sold += quantity
    return tickets


# ── Chapa ─────────────────────────────────────────────────────────────────────

def chapa_initiate(
    amount: float,
    email: str,
    full_name: str,
    tx_ref: str,
    return_url: str,
    lottery_title: str,
) -> str:
    """Initialize a Chapa payment and return the checkout URL."""
    url = f"{settings.CHAPA_BASE_URL}/transaction/initialize"
    payload = {
        "amount": str(amount),
        "currency": "ETB",
        "email": email,
        "first_name": full_name.split()[0],
        "last_name": full_name.split()[-1] if len(full_name.split()) > 1 else "",
        "tx_ref": tx_ref,
        "callback_url": f"{settings.FRONTEND_URL}/payment/callback",
        "return_url": return_url,
        "customization[title]": lottery_title,
    }
    headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}
    resp = httpx.post(url, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["data"]["checkout_url"]


def chapa_verify(tx_ref: str) -> bool:
    """Verify a Chapa transaction. Returns True if paid."""
    url = f"{settings.CHAPA_BASE_URL}/transaction/verify/{tx_ref}"
    headers = {"Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}"}
    try:
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("status") == "success"
    except Exception as e:
        logger.error("Chapa verify error: %s", e)
        return False


def verify_chapa_signature(payload: bytes, signature: str) -> bool:
    """Verify the HMAC-SHA256 signature Chapa sends in the webhook header."""
    if not settings.CHAPA_WEBHOOK_SECRET:
        return True  # skip in dev if not configured
    expected = hmac.new(
        settings.CHAPA_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def process_chapa_webhook(db: Session, body: dict) -> bool:
    """Handle a verified Chapa webhook. Returns True if tickets were issued."""
    tx_ref = body.get("tx_ref") or body.get("trx_ref")
    if not tx_ref:
        return False

    txn = db.scalar(select(PaymentTransaction).where(PaymentTransaction.gateway_ref == tx_ref))
    if not txn or txn.gateway_status == PaymentStatus.SUCCESS:
        return False  # already processed

    # Double-check with Chapa verify API
    if not chapa_verify(tx_ref):
        txn.gateway_status = PaymentStatus.FAILED
        txn.webhook_payload = body
        db.commit()
        return False

    return _settle_transaction(db, txn, body)


# ── Telebirr ──────────────────────────────────────────────────────────────────

def telebirr_initiate(amount: float, phone: str, tx_ref: str, lottery_title: str) -> bool:
    """Trigger a Telebirr USSD push to the user's phone.
    Returns True if the request was accepted.

    NOTE: Telebirr's production API uses AES+RSA encryption. This is a
    simplified wrapper — in production you must encrypt the payload per
    Telebirr's integration guide.
    """
    if not settings.TELEBIRR_APP_ID:
        logger.warning("Telebirr not configured — skipping USSD push")
        return False
    try:
        payload = {
            "appId": settings.TELEBIRR_APP_ID,
            "shortCode": settings.TELEBIRR_SHORT_CODE,
            "timeStamp": str(int(datetime.now(timezone.utc).timestamp())),
            "nonce": secrets.token_hex(8),
            "subject": lottery_title,
            "totalAmount": str(amount),
            "outTradeNo": tx_ref,
            "notifyUrl": f"{settings.FRONTEND_URL}/api/webhooks/telebirr",
            "returnApp": "",
            "returnUrl": f"{settings.FRONTEND_URL}/payment/callback",
        }
        # Production: sign + encrypt payload here per Telebirr docs
        resp = httpx.post(settings.TELEBIRR_BASE_URL, json=payload, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json().get("code") == "0"
    except Exception as e:
        logger.error("Telebirr initiate error: %s", e)
        return False


def process_telebirr_webhook(db: Session, body: dict) -> bool:
    """Handle Telebirr async callback."""
    # Production: decrypt body (AES-256-CBC) first
    out_trade_no = body.get("outTradeNo") or body.get("out_trade_no")
    trade_status = body.get("tradeStatus") or body.get("trade_status")
    if not out_trade_no:
        return False

    txn = db.scalar(select(PaymentTransaction).where(PaymentTransaction.gateway_ref == out_trade_no))
    if not txn or txn.gateway_status == PaymentStatus.SUCCESS:
        return False

    if trade_status != "1":   # 1 = success in Telebirr
        txn.gateway_status = PaymentStatus.FAILED
        txn.webhook_payload = body
        db.commit()
        return False

    return _settle_transaction(db, txn, body)


# ── Shared settlement ─────────────────────────────────────────────────────────

def _settle_transaction(db: Session, txn: PaymentTransaction, webhook_body: dict) -> bool:
    """Mark transaction SUCCESS and generate tickets. Must be atomic."""
    from sqlalchemy import text

    txn.gateway_status = PaymentStatus.SUCCESS
    txn.webhook_payload = webhook_body
    txn.verified_at = datetime.now(timezone.utc)

    # Lock the lottery row to prevent overselling.
    if "postgresql" in str(db.bind.url if hasattr(db, "bind") else ""):
        lottery = db.scalar(
            select(LotteryPost).where(LotteryPost.id == txn.lottery_id).with_for_update()
        )
    else:
        lottery = db.get(LotteryPost, txn.lottery_id)

    if not lottery:
        db.rollback()
        return False

    # Capacity check
    if lottery.total_tickets and (lottery.tickets_sold + txn.tickets_count) > lottery.total_tickets:
        txn.gateway_status = PaymentStatus.FAILED
        db.commit()
        return False

    user = db.get(User, txn.user_id)
    if not user:
        db.rollback()
        return False

    tickets = generate_tickets(db, lottery, user, txn, txn.tickets_count)
    db.commit()

    # Refresh ticket nos after commit
    ticket_nos = [t.ticket_no for t in tickets]
    send_ticket_confirmation(
        user.email, user.full_name, lottery.title,
        ticket_nos, lottery.draw_date.strftime("%Y-%m-%d"),
    )
    return True
