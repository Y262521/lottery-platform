"""Idempotent seeder for the demo admin account."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import Role, User
from .security import hash_password

# Previous default email used before the validator fix.
_OLD_ADMIN_EMAIL = "admin@lottery.local"


def seed_admin() -> None:
    """Create (or migrate) the admin user on startup.

    Handles three cases:
    1. Fresh DB — creates the admin with the configured email.
    2. Old email exists — updates it to the current ADMIN_EMAIL and re-hashes
       the password so credentials stay in sync with env vars.
    3. Current email already exists — ensures the role is ADMIN and password
       matches, then returns.
    """
    db: Session = SessionLocal()
    try:
        # Check for the current target email first.
        admin = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))

        if not admin:
            # Check for the legacy email and migrate it.
            admin = db.scalar(select(User).where(User.email == _OLD_ADMIN_EMAIL))
            if admin:
                admin.email = settings.ADMIN_EMAIL

        if admin:
            # Always sync password + role so env var changes take effect.
            admin.hashed_password = hash_password(settings.ADMIN_PASSWORD)
            admin.role = Role.ADMIN
            admin.is_active = True
            db.commit()
            return

        # No admin found at all — create fresh.
        new_admin = User(
            email=settings.ADMIN_EMAIL,
            full_name="Platform Administrator",
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=Role.ADMIN,
        )
        db.add(new_admin)
        db.commit()
    finally:
        db.close()
