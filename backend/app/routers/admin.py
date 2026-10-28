"""Admin: metrics, users, audit log, transaction management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import require_roles
from ..models import (AuditLog, LotteryPost, LotteryStatus, PaymentAccount,
                      PaymentStatus, PaymentTransaction, Role, Ticket, TicketStatus, User)
from ..schemas import (AdminResetPassword, AdminUserUpdate, AuditOut,
                       PaymentAccountCreate, PaymentAccountOut, PaymentAccountUpdate, UserOut)
from ..security import hash_password

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


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: AdminResetPassword,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.hashed_password = hash_password(payload.new_password)
    log(db, "admin.reset_password", actor_id=admin.id, entity="user", entity_id=user_id)
    db.commit()
    return {"message": "Password reset successfully", "user_id": user_id}


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
            "webhook_payload": t.webhook_payload,  # includes sender, phone, message, screenshot
        }
        for t in rows
    ]


@router.get("/audit", response_model=list[AuditOut])
def audit_logs(db: Session = Depends(get_db),
               _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR))):
    return db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)).all()


# ── Payment Accounts Management ───────────────────────────────────────────────
@router.get("/payment-accounts", response_model=list[PaymentAccountOut])
def list_payment_accounts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    return db.scalars(select(PaymentAccount).order_by(PaymentAccount.provider_type, PaymentAccount.provider_name)).all()


@router.post("/payment-accounts", response_model=PaymentAccountOut)
def upsert_payment_account(
    payload: PaymentAccountCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    pid = payload.provider_id.strip().upper()
    acct = db.scalar(select(PaymentAccount).where(PaymentAccount.provider_id == pid))
    if acct:
        acct.provider_type = payload.provider_type
        acct.provider_name = payload.provider_name.strip()
        acct.account_number = payload.account_number.strip()
        acct.account_holder = payload.account_holder.strip()
        acct.instructions = payload.instructions.strip() if payload.instructions else None
        acct.is_active = payload.is_active
    else:
        acct = PaymentAccount(
            provider_type=payload.provider_type,
            provider_id=pid,
            provider_name=payload.provider_name.strip(),
            account_number=payload.account_number.strip(),
            account_holder=payload.account_holder.strip(),
            instructions=payload.instructions.strip() if payload.instructions else None,
            is_active=payload.is_active,
        )
        db.add(acct)
    log(db, "admin.save_payment_account", actor_id=admin.id, entity="payment_account", detail=f"provider_id={pid}")
    db.commit()
    db.refresh(acct)
    return acct


@router.patch("/payment-accounts/{account_id}", response_model=PaymentAccountOut)
def update_payment_account(
    account_id: int,
    payload: PaymentAccountUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    acct = db.get(PaymentAccount, account_id)
    if not acct:
        raise HTTPException(404, "Payment account not found")
    if payload.account_number is not None:
        acct.account_number = payload.account_number.strip()
    if payload.account_holder is not None:
        acct.account_holder = payload.account_holder.strip()
    if payload.instructions is not None:
        acct.instructions = payload.instructions.strip() if payload.instructions else None
    if payload.is_active is not None:
        acct.is_active = payload.is_active
    log(db, "admin.update_payment_account", actor_id=admin.id, entity="payment_account", entity_id=account_id)
    db.commit()
    db.refresh(acct)
    return acct


@router.delete("/payment-accounts/{account_id}")
def delete_payment_account(
    account_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    acct = db.get(PaymentAccount, account_id)
    if not acct:
        raise HTTPException(404, "Payment account not found")
    db.delete(acct)
    log(db, "admin.delete_payment_account", actor_id=admin.id, entity="payment_account", entity_id=account_id)
    db.commit()
    return {"message": "Payment account deleted successfully", "id": account_id}

