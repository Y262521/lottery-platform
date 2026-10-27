"""Wallet endpoints: balance, deposit (demo), transaction history."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import log
from ..database import get_db
from ..deps import credit, get_current_user, get_or_create_wallet
from ..models import Transaction, TxnType, User
from ..schemas import DepositRequest, TransactionOut, WalletOut

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
def my_wallet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    wallet = get_or_create_wallet(db, user.id)
    db.commit()
    return wallet


@router.post("/deposit", response_model=WalletOut)
def deposit(
    payload: DepositRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Demo deposit endpoint. In production this is replaced by a payment
    gateway webhook (Stripe/Chapa/Telebirr) that verifies the payment before
    crediting. Exposed here only so the demo wallet is top-up-able."""
    credit(db, user, payload.amount, TxnType.DEPOSIT, reference="demo-deposit")
    log(db, "wallet.deposit", actor_id=user.id, detail=f"amount={payload.amount}")
    db.commit()
    wallet = get_or_create_wallet(db, user.id)
    return wallet


@router.get("/transactions", response_model=list[TransactionOut])
def my_transactions(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(200)
    ).all()
    return rows
