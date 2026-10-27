"""Append-only audit logger."""
from sqlalchemy.orm import Session
from .models import AuditLog


def log(db: Session, action: str, actor_id: int | None = None,
        entity: str | None = None, entity_id: int | None = None,
        detail: str | None = None, ip: str | None = None) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action,
                    entity=entity, entity_id=entity_id,
                    detail=detail, ip_address=ip))
