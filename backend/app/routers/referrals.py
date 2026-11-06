"""Referral system endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..audit import log
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import (
    Role, Ticket, TicketStatus, User, UserNotification,
)
from ..schemas import NotificationOut, ReferralStatsOut, SendNotificationRequest

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

REWARD_THRESHOLD = 5  # alert admin when a user reaches this many qualified referrals


def _qualified_count(db: Session, user_id: int) -> int:
    """Count referrals who have bought at least one confirmed ticket."""
    referred_ids = db.scalars(
        select(User.id).where(User.referred_by_id == user_id)
    ).all()
    if not referred_ids:
        return 0
    count = 0
    for rid in referred_ids:
        bought = db.scalar(
            select(func.count()).select_from(Ticket).where(
                Ticket.user_id == rid,
                Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
            )
        ) or 0
        if bought > 0:
            count += 1
    return count


# ── Public / user endpoints ───────────────────────────────────────────────────

@router.get("/my-stats")
def my_referral_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the current user's referral code, link, referral counts and reward account."""
    total = db.scalar(select(func.count()).select_from(User).where(User.referred_by_id == user.id)) or 0
    qualified = _qualified_count(db, user.id)
    return {
        "referral_code": user.referral_code,
        "total_referrals": total,
        "qualified_referrals": qualified,
        "reward_threshold": REWARD_THRESHOLD,
        "reward_account": user.reward_account or {},
    }


@router.post("/reward-account")
def save_reward_account(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """User saves their preferred reward account (Telebirr / bank)."""
    user.reward_account = payload
    db.commit()
    return {"ok": True, "reward_account": user.reward_account}


@router.get("/notifications", response_model=list[NotificationOut])
def my_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Notifications sent to this user by admin."""
    rows = db.scalars(
        select(UserNotification)
        .where(UserNotification.user_id == user.id)
        .order_by(UserNotification.created_at.desc())
    ).all()
    return rows


@router.post("/notifications/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.get(UserNotification, notif_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    db.commit()
    return {"ok": True}


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/leaderboard")
def referral_leaderboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
):
    """All users who have referred at least one person, sorted by qualified referrals desc."""
    # Get all unique referrer IDs
    referrer_ids = db.scalars(
        select(User.referred_by_id)
        .where(User.referred_by_id.is_not(None))
        .distinct()
    ).all()

    if not referrer_ids:
        return []

    referrers = db.scalars(select(User).where(User.id.in_(referrer_ids))).all()

    result = []
    for u in referrers:
        total = db.scalar(
            select(func.count()).select_from(User).where(User.referred_by_id == u.id)
        ) or 0
        qualified = _qualified_count(db, u.id)
        result.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "phone": u.phone,
            "referral_code": u.referral_code,
            "total_referrals": total,
            "qualified_referrals": qualified,
            "has_reward_alert": qualified >= REWARD_THRESHOLD,
            "reward_account": u.reward_account or {},
        })

    result.sort(key=lambda x: x["qualified_referrals"], reverse=True)
    return result


@router.get("/admin/alerts")
def reward_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.AUDITOR)),
):
    """Users who have reached the reward threshold and may deserve a reward."""
    referrer_ids = db.scalars(
        select(User.referred_by_id).where(User.referred_by_id.is_not(None)).distinct()
    ).all()

    alerts = []
    for uid in referrer_ids:
        qualified = _qualified_count(db, uid)
        if qualified >= REWARD_THRESHOLD:
            u = db.get(User, uid)
            if u:
                alerts.append({
                    "user_id": u.id,
                    "full_name": u.full_name,
                    "phone": u.phone,
                    "qualified_referrals": qualified,
                })
    return {"count": len(alerts), "users": alerts}


@router.post("/admin/notify", response_model=NotificationOut, status_code=201)
def send_reward_notification(
    payload: SendNotificationRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Admin sends a reward notification message to a user."""
    target = db.get(User, payload.user_id)
    if not target:
        raise HTTPException(404, "User not found")

    notif = UserNotification(
        user_id=payload.user_id,
        sender_id=admin.id,
        subject=payload.subject,
        message=payload.message,
        is_read=False,
    )
    db.add(notif)
    log(db, "referral.reward_sent", actor_id=admin.id, entity="user",
        entity_id=payload.user_id, detail=f"subject={payload.subject}")
    db.commit()
    db.refresh(notif)
    return notif
