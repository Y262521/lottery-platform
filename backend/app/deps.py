"""FastAPI dependencies: auth, role guards, DB session."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .models import Role, User
from .security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="የመግቢያ ክፍለ ጊዜ አልቋል / Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ተጠቃሚው አልተገኘም ወይም ታግዷል / User not found or inactive",
        )
    return user


def require_roles(*roles: Role):
    def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ይህንን እርምጃ ለመፈፀም ፈቃድ የለዎትም / Insufficient permissions",
            )
        return user
    return guard


def get_optional_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
                      db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    return db.get(User, int(payload.get("sub", 0)))
