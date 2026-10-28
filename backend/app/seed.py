"""Seed the admin user on startup."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .database import SessionLocal
from .models import Role, User
from .security import hash_password

_OLD_EMAILS = ["admin@lottery.local", "admin@lottery-platform.com"]


def seed_admin() -> None:
    db: Session = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not admin:
            for old in _OLD_EMAILS:
                admin = db.scalar(select(User).where(User.email == old))
                if admin:
                    admin.email = settings.ADMIN_EMAIL
                    break
        if not admin:
            admin = db.scalar(select(User).where(User.role == Role.ADMIN))
            if admin:
                admin.email = settings.ADMIN_EMAIL

        if admin:
            admin.hashed_password = hash_password(settings.ADMIN_PASSWORD)
            admin.role = Role.ADMIN
            admin.is_active = True
            if not admin.phone:
                admin.phone = "0900000000"
            db.commit()
            return
        db.add(User(
            email=settings.ADMIN_EMAIL,
            phone="0900000000",
            full_name="Platform Administrator",
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=Role.ADMIN,
        ))
        db.commit()
    finally:
        db.close()
