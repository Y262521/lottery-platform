"""Append-only audit logging for security/admin actions."""
from sqlalchemy.orm import Session

from .models import AuditLog


def log(db: Session, action: str, actor_id: int | None = None, detail: str | None = None) -> None:
    """Write an immutable audit record. Callers commit the surrounding transaction."""
    db.add(AuditLog(actor_id=actor_id, action=action, detail=detail))
