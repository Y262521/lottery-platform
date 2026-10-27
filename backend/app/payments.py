"""Ticket generation helper used by the manual payment confirmation flow."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .models import LotteryPost, PaymentTransaction, Ticket, TicketStatus, User


def generate_tickets(
    db: Session,
    lottery: LotteryPost,
    user: User,
    txn: PaymentTransaction,
    quantity: int,
) -> list[Ticket]:
    """Generate unique ticket numbers.

    Caller must hold a row lock on the lottery row (or rely on SQLite
    serialisation) to prevent duplicate sequence numbers.
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
