"""Admin: metrics, users, audit log, transaction management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import require_roles
from ..models import (AuditLog, LotteryPost, LotteryStatus, PaymentStatus,
                      PaymentTransaction, Role, Ticket, TicketStatus, User)
from ..schemas import AdminUserUpdate, AuditOut, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/metrics")
def metrics(db: Session = Depends(get_db),
            _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    total_revenue = db.scalar(
        select(func.coalesce(func.sum(PaymentTransaction.amount), 0.0))
        .where(PaymentTransaction.gateway_status == PaymentStatus.SUCCESS)
    )
    tickets_sold = db.scalar(select(func.count()).select_from(Ticket)
                             .where(Ticket.status == TicketStatus.CONFIRMED)) or 0
    winning_tickets = db.scalar(select(func.count()).select_from(Ticket)
                                .where(Ticket.status == TicketStatus.WON)) or 0
    active_lotteries = db.scalar(select(func.count()).select_from(LotteryPost)
                                 .where(LotteryPost.status == LotteryStatus.ACTIVE)) or 0
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    pending_payments = db.scalar(
        select(func.count()).select_from(PaymentTransaction)
        .where(PaymentTransaction.gateway_status == PaymentStatus.PENDING)
    ) or 0

    return {
        "total_revenue": round(float(total_revenue), 2),
        "tickets_sold": tickets_sold,
        "winning_tickets": winning_tickets,
        "active_lotteries": active_lotteries,
        "total_users": total_users,
        "pending_payments": pending_payments,
    }


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db),
               _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db),
                admin: User = Depends(require_roles(Role.ADMIN))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if payload.role:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    log(db, "admin.update_user", actor_id=admin.id, entity="user", entity_id=user_id)
    db.commit()
    return user


@router.get("/transactions")
def all_transactions(db: Session = Depends(get_db),
                     _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    rows = db.scalars(
        select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).limit(500)
    ).all()
    return [
        {
            "id": t.id, "user_id": t.user_id, "lottery_id": t.lottery_id,
            "amount": t.amount, "gateway": t.gateway, "gateway_ref": t.gateway_ref,
            "status": t.gateway_status, "tickets_count": t.tickets_count,
            "created_at": t.created_at, "verified_at": t.verified_at,
        }
        for t in rows
    ]


@router.get("/audit", response_model=list[AuditOut])
def audit_logs(db: Session = Depends(get_db),
               _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    return db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)).all()
