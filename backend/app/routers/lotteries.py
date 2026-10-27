"""Lottery post CRUD + media upload."""
import io
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import get_current_user, get_optional_user, require_roles
from ..media import upload_image
from ..models import LotteryPost, LotteryStatus, Role, User
from ..schemas import LotteryCreate, LotteryOut, LotteryUpdate

router = APIRouter(prefix="/api/lotteries", tags=["lotteries"])


def _to_out(lottery: LotteryPost) -> LotteryOut:
    return LotteryOut.model_validate(lottery)


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
        # Public only sees ACTIVE and DRAWN
        q = q.where(LotteryPost.status.in_([LotteryStatus.ACTIVE, LotteryStatus.DRAWN]))
    return [_to_out(l) for l in db.scalars(q).all()]


@router.get("/{lottery_id}", response_model=LotteryOut)
def get_lottery(lottery_id: int, db: Session = Depends(get_db),
                current_user: User | None = Depends(get_optional_user)):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    is_admin = current_user and current_user.role in (Role.ADMIN, Role.AUDITOR)
    if not is_admin and lottery.status not in (LotteryStatus.ACTIVE, LotteryStatus.DRAWN):
        raise HTTPException(404, "Lottery not found")
    return _to_out(lottery)


@router.post("", response_model=LotteryOut, status_code=201)
def create_lottery(
    payload: LotteryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = LotteryPost(**payload.model_dump(), created_by=admin.id)
    db.add(lottery)
    db.flush()
    log(db, "lottery.create", actor_id=admin.id, entity="lottery_post", entity_id=lottery.id,
        detail=f"title={lottery.title}")
    db.commit()
    return _to_out(lottery)


@router.patch("/{lottery_id}", response_model=LotteryOut)
def update_lottery(
    lottery_id: int, payload: LotteryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(lottery, k, v)
    log(db, "lottery.update", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/publish", response_model=LotteryOut)
def publish_lottery(
    lottery_id: int, db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    if lottery.status != LotteryStatus.DRAFT:
        raise HTTPException(409, "Only DRAFT lotteries can be published")
    lottery.status = LotteryStatus.ACTIVE
    log(db, "lottery.publish", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/close", response_model=LotteryOut)
def close_lottery(
    lottery_id: int, db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    if lottery.status != LotteryStatus.ACTIVE:
        raise HTTPException(409, "Only ACTIVE lotteries can be closed")
    lottery.status = LotteryStatus.CLOSED
    log(db, "lottery.close", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/cancel", response_model=LotteryOut)
def cancel_lottery(
    lottery_id: int, db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    if lottery.status == LotteryStatus.DRAWN:
        raise HTTPException(409, "Cannot cancel a drawn lottery")
    lottery.status = LotteryStatus.CANCELLED
    log(db, "lottery.cancel", actor_id=admin.id, entity="lottery_post", entity_id=lottery_id)
    db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/cover-image", response_model=LotteryOut)
async def upload_cover(
    lottery_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    content = await file.read()
    url = upload_image(content, folder="lottery/covers", public_id=f"lottery_{lottery_id}_cover")
    if url:
        lottery.cover_image_url = url
        db.commit()
    return _to_out(lottery)


@router.post("/{lottery_id}/prize-images", response_model=LotteryOut)
async def upload_prize_images(
    lottery_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
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
