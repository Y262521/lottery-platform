"""Idempotent seeder for the demo admin account."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import Role, User
from .security import hash_password


def seed_admin() -> None:
    """Create the default admin user if it doesn't already exist."""
    db: Session = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if existing:
            return
        admin = User(
            email=settings.ADMIN_EMAIL,
            full_name="Platform Administrator",
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=Role.ADMIN,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()
