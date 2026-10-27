"""Admin/operations endpoints: users, audit logs, sales metrics."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..audit import log
from ..database import get_db
from ..deps import require_roles
from ..models import (
    AuditLog,
    Draw,
    Role,
    Ticket,
    TicketStatus,
    Transaction,
    TxnType,
    User,
)
from ..schemas import AdminAuditOut, AdminUpdateUser, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: AdminUpdateUser,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.role is not None:
        if user.id == admin.id and payload.role != Role.ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot demote yourself")
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == admin.id and not payload.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot disable yourself")
        user.is_active = payload.is_active
    log(db, "admin.update_user", actor_id=admin.id, detail=f"user_id={user_id} role={payload.role} active={payload.is_active}")
    db.commit()
    return user


@router.get("/audit", response_model=list[AdminAuditOut])
def audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
):
    return db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)).all()


@router.get("/metrics")
def metrics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
):
    """High-level sales & payout metrics for the operations dashboard."""
    total_sales = db.scalar(
        select(func.coalesce(func.sum(-Transaction.amount), 0.0)).where(
            Transaction.type == TxnType.TICKET_PURCHASE
        )
    )
    total_payouts = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
            Transaction.type == TxnType.PAYOUT
        )
    )
    tickets_sold = db.scalar(select(func.count()).select_from(Ticket)) or 0
    active_draws = db.scalar(
        select(func.count()).select_from(Draw).where(Draw.status == "SCHEDULED")
    ) or 0
    completed_draws = db.scalar(
        select(func.count()).select_from(Draw).where(Draw.status == "COMPLETED")
    ) or 0
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    winning_tickets = db.scalar(
        select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.WIN)
    ) or 0

    return {
        "total_ticket_sales": round(float(total_sales), 2),
        "total_payouts": round(float(total_payouts), 2),
        "tickets_sold": int(tickets_sold),
        "winning_tickets": int(winning_tickets),
        "active_draws": int(active_draws),
        "completed_draws": int(completed_draws),
        "users": int(user_count),
    }
