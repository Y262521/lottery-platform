"""Ticket generation and allocation helper."""
from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .models import LotteryPost, PaymentTransaction, Ticket, TicketStatus, User


def allocate_ticket_numbers(db: Session, lottery: LotteryPost, count: int) -> list[str]:
    """Allocate `count` unique ticket numbers for `lottery`, guaranteed never to collide.

    Format: LP{lottery_id:03d}-{seq:05d}
    """
    prefix = f"LP{lottery.id:03d}-"

    # Get all ticket numbers already associated with this lottery
    existing_in_db = set(
        db.scalars(
            select(Ticket.ticket_no).where(Ticket.lottery_id == lottery.id)
        ).all()
    )

    # Include any in-memory ticket numbers currently in session
    session_ticket_nos = {
        obj.ticket_no
        for obj in list(db.new) + list(db.dirty)
        if isinstance(obj, Ticket) and getattr(obj, "ticket_no", None)
    }

    all_taken = existing_in_db | session_ticket_nos

    # Find the maximum numeric sequence currently used for this lottery's confirmed tickets
    max_seq = 0
    for t_no in all_taken:
        if t_no.startswith(prefix):
            suffix = t_no[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))

    # Base sequence is at least max_seq or tickets_sold
    curr_seq = max(max_seq, lottery.tickets_sold or 0)

    allocated = []
    while len(allocated) < count:
        curr_seq += 1
        candidate = f"{prefix}{curr_seq:05d}"
        if candidate not in all_taken:
            # Check global tickets table to be absolutely certain
            exists = db.scalar(select(Ticket.id).where(Ticket.ticket_no == candidate))
            if not exists:
                allocated.append(candidate)
                all_taken.add(candidate)

    return allocated


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

    ticket_nos = allocate_ticket_numbers(db, lottery, quantity)
    tickets = []
    for i, t_no in enumerate(ticket_nos):
        chosen = chosen_numbers[i] if i < len(chosen_numbers) else None
        t = Ticket(
            ticket_no=t_no,
            chosen_number=chosen,
            lottery_id=lottery.id,
            user_id=user.id,
            status=TicketStatus.CONFIRMED,
            payment_txn_id=txn.id,
            confirmed_at=datetime.now(timezone.utc),
        )
        db.add(t)
        tickets.append(t)

    db.flush()
    actual_sold = db.scalar(
        select(func.count()).select_from(Ticket).where(
            Ticket.lottery_id == lottery.id,
            Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
        )
    ) or 0
    lottery.tickets_sold = actual_sold
    return tickets
