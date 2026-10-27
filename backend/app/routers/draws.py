"""Draw lifecycle: list, detail, create (admin), run a draw (admin)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..audit import log
from ..database import get_db
from ..deps import credit, require_roles
from ..draw_engine import (
    compute_winning_numbers,
    generate_server_seed,
    hash_seed,
)
from ..models import Draw, DrawStatus, Role, Ticket, TicketStatus, TxnType, User
from ..schemas import DrawCreate, DrawOut, DrawRevealOut

router = APIRouter(prefix="/api/draws", tags=["draws"])


def to_out(draw: Draw, db: Session) -> DrawOut:
    count = db.scalar(select(func.count()).select_from(Ticket).where(Ticket.draw_id == draw.id))
    return DrawOut(
        id=draw.id,
        title=draw.title,
        status=draw.status,
        ticket_price=draw.ticket_price,
        jackpot=draw.jackpot,
        numbers_per_ticket=draw.numbers_per_ticket,
        number_min=draw.number_min,
        number_max=draw.number_max,
        sales_open_at=draw.sales_open_at,
        sales_close_at=draw.sales_close_at,
        draw_at=draw.draw_at,
        server_seed_hash=draw.server_seed_hash,
        winning_numbers=draw.winning_numbers,
        created_at=draw.created_at,
        completed_at=draw.completed_at,
        ticket_count=count or 0,
    )


@router.get("", response_model=list[DrawOut])
def list_draws(db: Session = Depends(get_db)):
    draws = db.scalars(select(Draw).order_by(Draw.draw_at.desc())).all()
    return [to_out(d, db) for d in draws]


@router.get("/{draw_id}", response_model=DrawOut)
def get_draw(draw_id: int, db: Session = Depends(get_db)):
    draw = db.get(Draw, draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")
    return to_out(draw, db)


@router.post("", response_model=DrawOut, status_code=status.HTTP_201_CREATED)
def create_draw(
    payload: DrawCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    # Commit phase: generate a secret server seed and publish only its hash.
    server_seed = generate_server_seed()
    draw = Draw(
        title=payload.title,
        status=DrawStatus.SCHEDULED,
        ticket_price=payload.ticket_price,
        jackpot=payload.jackpot,
        numbers_per_ticket=payload.numbers_per_ticket,
        number_min=payload.number_min,
        number_max=payload.number_max,
        sales_close_at=payload.sales_close_at,
        draw_at=payload.draw_at,
        server_seed=server_seed,
        server_seed_hash=hash_seed(server_seed),
        nonce=0,
    )
    db.add(draw)
    db.flush()
    log(db, "draw.create", actor_id=admin.id, detail=f"draw_id={draw.id} title={draw.title}")
    db.commit()
    return to_out(draw, db)


@router.post("/{draw_id}/freeze", response_model=DrawOut)
def freeze_draw(
    draw_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    draw = db.get(Draw, draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")
    if draw.status != DrawStatus.SCHEDULED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Draw is not in a freezable state")
    draw.status = DrawStatus.FROZEN
    log(db, "draw.freeze", actor_id=admin.id, detail=f"draw_id={draw.id}")
    db.commit()
    return to_out(draw, db)


@router.post("/{draw_id}/run", response_model=DrawRevealOut)
def run_draw(
    draw_id: int,
    client_seed: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Execute the reveal phase and settle all tickets.

    `client_seed` may be supplied by the operator (e.g. a published future block
    hash) or, for the demo, auto-generated from OS entropy + the draw id.
    """
    draw = db.get(Draw, draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")
    if draw.status not in (DrawStatus.SCHEDULED, DrawStatus.FROZEN):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Draw already completed or cancelled")
    if draw.status != DrawStatus.FROZEN:
        draw.status = DrawStatus.FROZEN  # allow direct run, but mark frozen first

    # Use an explicit client seed. If none provided, derive one transparently.
    if not client_seed:
        from secrets import token_hex

        client_seed = f"demo:{draw.id}:{token_hex(8)}"

    draw.client_seed = client_seed
    draw.nonce = draw.id  # stable, unique per draw

    winning = compute_winning_numbers(draw, client_seed, draw.nonce)
    draw.winning_numbers = winning
    draw.status = DrawStatus.COMPLETED
    draw.completed_at = datetime.now(timezone.utc)

    # Settle tickets: compare against winning numbers and pay prizes.
    tickets = db.scalars(select(Ticket).where(Ticket.draw_id == draw.id)).all()
    winners = 0
    for t in tickets:
        matched = len(set(t.numbers) & set(winning))
        t.matched_count = matched
        if matched == draw.numbers_per_ticket:
            t.status = TicketStatus.WIN
            # Demo: a single jackpot tier. Each jackpot winner gets the full
            # jackpot amount (real systems split it across multiple winners).
            t.prize = draw.jackpot
            winners += 1
            # Credit the winner's wallet. (Real systems split the jackpot across winners.)
            owner = db.get(User, t.user_id)
            if owner:
                credit(db, owner, t.prize, TxnType.PAYOUT, reference=f"ticket:{t.id}")
        else:
            t.status = TicketStatus.LOSE
            t.prize = 0.0

    log(db, "draw.run", actor_id=admin.id, detail=f"draw_id={draw.id} winners={winners} numbers={winning}")
    db.commit()
    return DrawRevealOut(
        id=draw.id,
        server_seed=draw.server_seed,
        server_seed_hash=draw.server_seed_hash,
        client_seed=draw.client_seed,
        nonce=draw.nonce,
        winning_numbers=winning,
    )


@router.post("/{draw_id}/cancel", response_model=DrawOut)
def cancel_draw(
    draw_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    draw = db.get(Draw, draw_id)
    if not draw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draw not found")
    if draw.status == DrawStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot cancel a completed draw")

    # Refund all active tickets.
    tickets = db.scalars(select(Ticket).where(Ticket.draw_id == draw.id)).all()
    for t in tickets:
        if t.status == TicketStatus.ACTIVE:
            owner = db.get(User, t.user_id)
            if owner:
                credit(db, owner, draw.ticket_price, TxnType.REFUND, reference=f"ticket:{t.id}")
            t.status = TicketStatus.REFUNDED

    draw.status = DrawStatus.CANCELLED
    log(db, "draw.cancel", actor_id=admin.id, detail=f"draw_id={draw.id}")
    db.commit()
    return to_out(draw, db)
