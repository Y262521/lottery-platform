"""Auth: register, login, refresh, me."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import get_current_user
from ..models import Role, User
from ..schemas import LoginRequest, ProfileUpdate, RefreshRequest, TokenPair, UserCreate, UserOut
from ..security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    phone = payload.phone.strip() if payload.phone else ""
    if not phone:
        raise HTTPException(400, "ስልክ ቁጥር ማስገባት ግዴታ ነው / Phone number is required")

    # Check if phone number already registered
    existing_phone = db.scalar(select(User).where(User.phone == phone))
    if existing_phone:
        raise HTTPException(409, "ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል / Phone number is already registered")

    email = str(payload.email).strip().lower() if payload.email else None
    if email:
        existing_email = db.scalar(select(User).where(func.lower(User.email) == email))
        if existing_email:
            raise HTTPException(409, "ይህ ኢሜይል ቀድሞ ተመዝግቧል / Email is already registered")

    user = User(
        email=email,
        phone=phone,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=Role.USER,
    )
    db.add(user)
    db.flush()
    log(db, "user.register", actor_id=user.id, entity="user", entity_id=user.id)
    db.commit()
    return user


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    login_id = payload.login_id
    if not login_id:
        raise HTTPException(400, "ስልክ ቁጥር ወይም ኢሜይል ማስገባት ያስፈልጋል / Email or phone number is required")

    clean_id = login_id.strip()

    # Search by email or phone
    user = db.scalar(
        select(User).where(
            (func.lower(User.email) == clean_id.lower()) |
            (User.phone == clean_id)
        )
    )

    # If not found and identifier contains only phone-like characters, try normalized variants
    if not user:
        digits = clean_id.lstrip("+").strip()
        if digits.isdigit():
            alt_candidates = []
            if digits.startswith("251"):
                alt_candidates.append("0" + digits[3:])
                alt_candidates.append("+" + digits)
            elif digits.startswith("0"):
                alt_candidates.append("+251" + digits[1:])
                alt_candidates.append(digits[1:])
            elif len(digits) == 9:
                alt_candidates.append("0" + digits)
                alt_candidates.append("+251" + digits)

            for cand in alt_candidates:
                user = db.scalar(select(User).where(User.phone == cand))
                if user:
                    break

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "የተሳሳተ ስልክ/ኢሜይል ወይም የይለፍ ቃል / Invalid phone/email or password")
    if not user.is_active:
        raise HTTPException(403, "ይህ መለያ ለጊዜው ታግዷል ወይም ተሰናክሏል / Account is disabled")
    log(db, "user.login", actor_id=user.id)
    db.commit()
    return TokenPair(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(401, "የመግቢያ ክፍለ ጊዜ አልቋል / Session expired, please sign in again")
    return TokenPair(
        access_token=create_access_token(data["sub"]),
        refresh_token=create_refresh_token(data["sub"]),
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.full_name is not None and payload.full_name.strip():
        user.full_name = payload.full_name.strip()

    if payload.phone is not None and payload.phone.strip():
        new_phone = payload.phone.strip()
        existing = db.scalar(select(User).where(User.phone == new_phone, User.id != user.id))
        if existing:
            raise HTTPException(409, "ይህ ስልክ ቁጥር ለሌላ መለያ ተመዝግቧል / Phone number is already registered to another account")
        user.phone = new_phone

    if payload.email is not None:
        new_email = str(payload.email).strip().lower() if payload.email else None
        if new_email:
            existing = db.scalar(select(User).where(func.lower(User.email) == new_email, User.id != user.id))
            if existing:
                raise HTTPException(409, "ይህ ኢሜይል ለሌላ መለያ ተመዝግቧል / Email is already registered to another account")
            user.email = new_email
        else:
            user.email = None

    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(400, "ያስገቡት የአሁኑ የይለፍ ቃል የተሳሳተ ነው / Current password is incorrect")
        user.hashed_password = hash_password(payload.new_password)

    log(db, "user.update_profile", actor_id=user.id, entity="user", entity_id=user.id)
    db.commit()
    db.refresh(user)
    return user
