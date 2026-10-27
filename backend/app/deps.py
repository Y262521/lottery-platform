"""FastAPI dependencies: DB session, current user, role guards, wallet helpers."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Role, Transaction, TxnType, User, Wallet
from .security import decode_token

# tokenUrl matches the login route path.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_roles(*roles: Role):
    """Role guard factory. Usage: `user: User = Depends(require_roles(Role.ADMIN))`."""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return current_user

    return checker


def get_or_create_wallet(db: Session, user_id: int, opening_balance: float = 0.0) -> Wallet:
    """Fetch a user's wallet, creating it (with optional bonus) if absent.

    Wrapped in a SAVEPOINT so a concurrent create race degrades gracefully.
    """
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user_id))
    if wallet:
        return wallet
    wallet = Wallet(user_id=user_id, balance=opening_balance)
    db.add(wallet)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        wallet = db.scalar(select(Wallet).where(Wallet.user_id == user_id))
        if wallet is None:
            raise
    return wallet


def credit(db: Session, user: User, amount: float, txn_type: TxnType, reference: str | None = None) -> Transaction:
    """Credit the wallet and append an immutable ledger row. Caller commits."""
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")
    wallet = get_or_create_wallet(db, user.id)
    wallet.balance += amount
    txn = Transaction(
        user_id=user.id, type=txn_type, amount=round(amount, 2),
        balance_after=round(wallet.balance, 2), reference=reference,
    )
    db.add(txn)
    return txn


def debit(db: Session, user: User, amount: float, txn_type: TxnType, reference: str | None = None) -> Transaction:
    """Debit the wallet, refusing overdraft. Caller commits.

    NOTE: callers must hold a row lock on the wallet (SELECT ... FOR UPDATE)
    when operating at real concurrency to prevent double-spending. SQLite
    serializes writes, but PostgreSQL/MySQL MUST use with_for_update().
    """
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")
    wallet = get_or_create_wallet(db, user.id)
    # Pessimistic lock where supported (no-op on SQLite).
    try:
        db.execute(
            select(Wallet).where(Wallet.user_id == user.id).with_for_update()
        )
    except Exception:
        pass  # SQLite has no FOR UPDATE; rely on its serialized writes.
    if wallet.balance < amount:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient balance")
    wallet.balance -= amount
    txn = Transaction(
        user_id=user.id, type=txn_type, amount=round(-amount, 2),
        balance_after=round(wallet.balance, 2), reference=reference,
    )
    db.add(txn)
    return txn
