"""Ticket endpoints: buy a ticket (concurrency-safe) and list my tickets."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import log
from ..database import get_db
from ..deps import debit, get_current_user
from ..draw_engine import draw_entirely_random
from ..models import Draw, DrawStatus, Ticket, TicketStatus, TxnType, User
from ..schemas import TicketCreate, TicketOut

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def buy_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    draw = db.get(Draw, payload.draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")

    if draw.status != DrawStatus.SCHEDULED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Draw is not open for sales")
    now = datetime.now(timezone.utc)
    if now >= draw.sales_close_at:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket sales are closed for this draw")

    # Validate the selected numbers fall in range and have the right count.
    if len(payload.numbers) != draw.numbers_per_ticket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pick exactly {draw.numbers_per_ticket} numbers",
        )
    for n in payload.numbers:
        if not (draw.number_min <= n <= draw.number_max):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Numbers must be between {draw.number_min} and {draw.number_max}",
            )

    # Debit first (refuses overdraft, holds a row lock where supported).
    txn = debit(db, user, draw.ticket_price, TxnType.TICKET_PURCHASE)

    ticket = Ticket(
        user_id=user.id,
        draw_id=draw.id,
        numbers=sorted(payload.numbers),
        status=TicketStatus.ACTIVE,
    )
    db.add(ticket)
    db.flush()  # assign ticket.id for the ledger reference

    txn.reference = f"ticket:{ticket.id}"
    log(db, "ticket.buy", actor_id=user.id, detail=f"draw_id={draw.id} ticket_id={ticket.id}")
    db.commit()
    return TicketOut(
        id=ticket.id,
        draw_id=ticket.draw_id,
        numbers=ticket.numbers,
        status=ticket.status,
        matched_count=ticket.matched_count,
        prize=ticket.prize,
        purchased_at=ticket.purchased_at,
    )


@router.get("/quick-pick/{draw_id}", response_model=list[int])
def quick_pick(draw_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return a CSPRNG quick-pick set of numbers for the given draw."""
    draw = db.get(Draw, draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")
    return draw_entirely_random(draw.numbers_per_ticket, draw.number_min, draw.number_max)


@router.get("/mine", response_model=list[TicketOut])
def my_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(Ticket).where(Ticket.user_id == user.id).order_by(Ticket.purchased_at.desc())
    ).all()
    return [
        TicketOut(
            id=t.id, draw_id=t.draw_id, numbers=t.numbers, status=t.status,
            matched_count=t.matched_count, prize=t.prize, purchased_at=t.purchased_at,
        )
        for t in rows
    ]
