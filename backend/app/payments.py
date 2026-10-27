"""Ticket generation helper."""
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
    """Generate confirmed tickets. Assigns chosen_numbers from webhook_payload if present."""
    chosen_numbers = []
    if txn.webhook_payload and txn.webhook_payload.get("chosen_numbers"):
        chosen_numbers = txn.webhook_payload["chosen_numbers"]

    tickets = []
    for i in range(quantity):
        seq = lottery.tickets_sold + len(tickets) + 1
        ticket_no = f"LP{lottery.id:03d}-{seq:05d}"
        chosen = chosen_numbers[i] if i < len(chosen_numbers) else None
        t = Ticket(
            ticket_no=ticket_no,
            chosen_number=chosen,
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
