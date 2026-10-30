"""Lottery post CRUD + media upload."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import get_optional_user, require_roles
from ..media import upload_image
from ..models import (
    LotteryPost, LotteryStatus, PaymentStatus, PaymentTransaction,
    Role, Ticket, TicketStatus, User,
)
from ..schemas import LotteryCreate, LotteryOut, LotteryUpdate

router = APIRouter(prefix="/api/lotteries", tags=["lotteries"])


def _to_out(lottery: LotteryPost, db: Session | None = None) -> LotteryOut:
    out = LotteryOut.model_validate(lottery)
    if db is not None:
        actual_sold = db.scalar(
            select(func.count()).select_from(Ticket).where(
                Ticket.lottery_id == lottery.id,
                Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
            )
        )
        if actual_sold is not None:
            out.tickets_sold = actual_sold
            if lottery.tickets_sold != actual_sold:
                lottery.tickets_sold = actual_sold
                try:
                    db.commit()
                except Exception:
                    db.rollback()
    return out


def _list_to_out(lotteries: list[LotteryPost], db: Session) -> list[LotteryOut]:
    if not lotteries:
        return []
    lottery_ids = [l.id for l in lotteries]
    counts_map = dict(
        db.execute(
            select(Ticket.lottery_id, func.count(Ticket.id))
            .where(
                Ticket.lottery_id.in_(lottery_ids),
                Ticket.status.in_([TicketStatus.CONFIRMED, TicketStatus.WON, TicketStatus.LOST]),
            )
            .group_by(Ticket.lottery_id)
        ).all()
    )
    res = []
    dirty = False
    for l in lotteries:
        out = LotteryOut.model_validate(l)
        actual = counts_map.get(l.id, 0)
        out.tickets_sold = actual
        if l.tickets_sold != actual:
            l.tickets_sold = actual
            dirty = True
        res.append(out)
    if dirty:
        try:
            db.commit()
        except Exception:
            db.rollback()
    return res


def _effective_range(lottery: LotteryPost) -> tuple[int, int] | None:
    """Return (min, max) for ticket number selection.

    If admin set an explicit range, use it.
    Otherwise if total_tickets is set, use 1..total_tickets.
    Otherwise return None (no picker).
    """
    if lottery.ticket_number_max:
        return (lottery.ticket_number_min or 1, lottery.ticket_number_max)
    if lottery.total_tickets:
        return (1, lottery.total_tickets)
    return None


@router.get("", response_model=list[LotteryOut])
def list_lotteries(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    q = select(LotteryPost).order_by(LotteryPost.created_at.desc())
    if current_user and current_user.role in (Role.ADMIN, Role.AUDITOR):
        if status_filter:
            q = q.where(LotteryPost.status == status_filter)
    else:
        q = q.where(LotteryPost.status.in_([LotteryStatus.ACTIVE, LotteryStatus.DRAWN]))
    return _list_to_out(db.scalars(q).all(), db)


@router.get("/{lottery_id}", response_model=LotteryOut)
def get_lottery(lottery_id: int, db: Session = Depends(get_db),
                current_user: User | None = Depends(get_optional_user)):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    is_admin = current_user and current_user.role in (Role.ADMIN, Role.AUDITOR)
    if not is_admin and lottery.status not in (LotteryStatus.ACTIVE, LotteryStatus.DRAWN):
        raise HTTPException(404, "ዕጣው አልተገኘም ወይም አይገኝም / Draw not found or unavailable")
    return _to_out(lottery, db)


@router.post("", response_model=LotteryOut, status_code=201)
def create_lottery(
    payload: LotteryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = LotteryPost(**payload.model_dump(), created_by=admin.id)
    db.add(lottery)
    db.flush()
    log(db, "lottery.create", actor_id=admin.id, entity="lottery_post",
        entity_id=lottery.id, detail=f"title={lottery.title}")
    db.commit()
    return _to_out(lottery)


@router.delete("/{lottery_id}", status_code=204)
def delete_lottery(lottery_id: int, db: Session = Depends(get_db),
                   admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    if lottery.status != LotteryStatus.DRAFT:
        raise HTTPException(409, "ረቂቅ (Draft) የሆኑ ዕጣዎችን ብቻ መሰረዝ ይቻላል / Only DRAFT draws can be deleted")
    log(db, "lottery.delete", actor_id=admin.id, entity="lottery_post",
        entity_id=lottery_id, detail=f"title={lottery.title}")
    db.delete(lottery)
    db.commit()


@router.patch("/{lottery_id}", response_model=LotteryOut)
def update_lottery(lottery_id: int, payload: LotteryUpdate,
                   db: Session = Depends(get_db),
                   admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(lottery, k, v)
    log(db, "lottery.update", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    db.refresh(lottery)
    return _to_out(lottery)


@router.post("/{lottery_id}/publish", response_model=LotteryOut)
def publish_lottery(lottery_id: int, db: Session = Depends(get_db),
                    admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    if lottery.status != LotteryStatus.DRAFT:
        raise HTTPException(409, "ረቂቅ (Draft) የሆኑ ዕጣዎችን ብቻ ማሳተም ይቻላል / Only DRAFT draws can be published")
    lottery.status = LotteryStatus.ACTIVE
    log(db, "lottery.publish", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/close", response_model=LotteryOut)
def close_lottery(lottery_id: int, db: Session = Depends(get_db),
                  admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    if lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(409, "ንቁ የሆኑ ዕጣዎችን ብቻ መዝጋት ይቻላል / Only ACTIVE draws can be closed")
    lottery.status = LotteryStatus.CLOSED
    log(db, "lottery.close", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/cancel", response_model=LotteryOut)
def cancel_lottery(lottery_id: int, db: Session = Depends(get_db),
                   admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    if lottery.status == LotteryStatus.DRAWN:
        raise HTTPException(409, "ዕጣ የወጣበትን ውድድር መሰረዝ አይቻልም / Cannot cancel an already drawn event")
    lottery.status = LotteryStatus.CANCELLED
    log(db, "lottery.cancel", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/reset", response_model=LotteryOut)
def reset_lottery(lottery_id: int, db: Session = Depends(get_db),
                  admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "ዕጣው አልተገኘም / Draw not found")
    if lottery.status == LotteryStatus.DRAWN:
        raise HTTPException(409, "ዕጣ የወጣበትን ውድድር መልሶ ማስጀመር አይቻልም / Cannot reset an already drawn event")
    lottery.status = LotteryStatus.ACTIVE
    log(db, "lottery.reset", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.get("/{lottery_id}/taken-numbers")
def taken_numbers(lottery_id: int, db: Session = Depends(get_db)):
    """Return taken numbers AND the effective selectable range for this lottery.
    
    Includes numbers from confirmed tickets, in-progress pending payment tickets,
    and pending transactions.
    """
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    rows = db.scalars(
        select(Ticket.chosen_number).where(
            Ticket.lottery_id == lottery_id,
            Ticket.chosen_number.is_not(None),
            Ticket.status.in_([
                TicketStatus.PENDING_PAYMENT, TicketStatus.CONFIRMED,
                TicketStatus.WON, TicketStatus.LOST,
            ])
        )
    ).all()
    taken_set = set(rows)

    # Also include chosen numbers from pending payment transactions
    pending_txns = db.scalars(
        select(PaymentTransaction).where(
            PaymentTransaction.lottery_id == lottery_id,
            PaymentTransaction.gateway_status == PaymentStatus.PENDING,
        )
    ).all()
    for p_tx in pending_txns:
        if p_tx.webhook_payload and isinstance(p_tx.webhook_payload, dict):
            for num in p_tx.webhook_payload.get("chosen_numbers") or []:
                if isinstance(num, int):
                    taken_set.add(num)

    rng = _effective_range(lottery)
    return {
        "taken": sorted(list(taken_set)),
        "range": {"min": rng[0], "max": rng[1]} if rng else None,
    }


@router.post("/{lottery_id}/cover-image", response_model=LotteryOut)
async def upload_cover(lottery_id: int, file: UploadFile = File(...),
                       db: Session = Depends(get_db),
                       admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    content = await file.read()
    url = upload_image(content, folder="lottery/covers",
                       public_id=f"lottery_{lottery_id}_cover")
    if url:
        lottery.cover_image_url = url
        db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/prize-images", response_model=LotteryOut)
async def upload_prize_images(lottery_id: int, files: list[UploadFile] = File(...),
                               db: Session = Depends(get_db),
                               admin: User = Depends(require_roles(Role.ADMIN))):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    urls = lottery.prize_image_urls or []
    for i, f in enumerate(files):
        content = await f.read()
        url = upload_image(content, folder="lottery/prizes",
                           public_id=f"lottery_{lottery_id}_prize_{len(urls)+i}")
        if url:
            urls.append(url)
    if urls:
        lottery.prize_image_urls = urls
        db.commit()
    return _to_out(lottery)
