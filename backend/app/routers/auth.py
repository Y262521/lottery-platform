"""Authentication endpoints: register, login (JWT pair), refresh, me."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import log
from ..config import settings
from ..database import get_db
from ..deps import credit, get_current_user, get_or_create_wallet
from ..models import Role, TxnType, User
from ..schemas import (
    LoginRequest,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserOut,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=Role.USER,
    )
    db.add(user)
    db.flush()
    # Create an empty wallet, then credit the sign-up bonus as a ledger entry
    # (so the bonus is auditable). Doing both would double-credit the bonus.
    get_or_create_wallet(db, user.id, opening_balance=0.0)
    if settings.SIGNUP_BONUS:
        credit(db, user, settings.SIGNUP_BONUS, TxnType.BONUS, reference="signup-bonus")
    log(db, "user.register", actor_id=user.id, detail=f"email={user.email}")
    db.commit()
    return user


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    log(db, "user.login", actor_id=user.id, detail=f"email={user.email}")
    db.commit()
    return TokenPair(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return TokenPair(
        access_token=create_access_token(data["sub"]),
        refresh_token=create_refresh_token(data["sub"]),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
