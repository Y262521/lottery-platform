"""Ticket endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Role, Ticket, User
from ..schemas import TicketOut

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("/mine", response_model=list[TicketOut])
def my_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(Ticket).where(Ticket.user_id == user.id)
        .order_by(Ticket.created_at.desc())
    ).all()
    return rows


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if ticket.user_id != user.id and user.role not in (Role.ADMIN, Role.AUDITOR):
        raise HTTPException(403, "Not your ticket")
    return ticket


@router.get("/lottery/{lottery_id}", response_model=list[TicketOut])
def lottery_tickets(lottery_id: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    return db.scalars(
        select(Ticket).where(Ticket.lottery_id == lottery_id)
        .order_by(Ticket.ticket_no)
    ).all()
