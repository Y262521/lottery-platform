"""Draw results: publish winners + video proof."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..audit import log
from ..database import get_db
from ..deps import require_roles
from ..media import upload_image, upload_video
from ..models import DrawResult, LotteryPost, LotteryStatus, Role, Ticket, TicketStatus, User
from ..notifications import send_winner_notification
from ..schemas import DrawResultCreate, DrawResultOut

router = APIRouter(prefix="/api/lotteries", tags=["results"])


@router.post("/{lottery_id}/results", response_model=DrawResultOut, status_code=201)
def publish_results(
    lottery_id: int,
    payload: DrawResultCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    lottery = db.get(LotteryPost, lottery_id)
    if not lottery:
        raise HTTPException(404, "Lottery not found")
    if lottery.status not in (LotteryStatus.CLOSED, LotteryStatus.ACTIVE):
        raise HTTPException(409, "Lottery must be CLOSED or ACTIVE to publish results")
    if db.scalar(select(DrawResult).where(DrawResult.lottery_id == lottery_id)):
        raise HTTPException(409, "Results already published for this lottery")

    result = DrawResult(
        lottery_id=lottery_id,
        winning_ticket_nos=payload.winning_ticket_nos,
        notes=payload.notes,
        published_by=admin.id,
    )
    db.add(result)
    lottery.status = LotteryStatus.DRAWN

    # Mark tickets as WON or LOST
    winning_set = set(payload.winning_ticket_nos)
    tickets = db.scalars(select(Ticket).where(Ticket.lottery_id == lottery_id)).all()
    for t in tickets:
        if t.status == TicketStatus.CONFIRMED:
            t.status = TicketStatus.WON if t.ticket_no in winning_set else TicketStatus.LOST
            if t.status == TicketStatus.WON:
                winner = db.get(User, t.user_id)
                if winner:
                    send_winner_notification(winner.email, winner.full_name, lottery.title, t.ticket_no)

    log(db, "draw.results_published", actor_id=admin.id, entity="lottery_post",
        entity_id=lottery_id, detail=f"winners={payload.winning_ticket_nos}")
    db.commit()
    db.refresh(result)
    return result


@router.post("/{lottery_id}/results/video", response_model=DrawResultOut)
async def upload_draw_video(
    lottery_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    result = db.scalar(select(DrawResult).where(DrawResult.lottery_id == lottery_id))
    if not result:
        raise HTTPException(404, "Publish results first before uploading video")
    content = await file.read()
    url = upload_video(content, folder="lottery/draw_videos",
                       public_id=f"lottery_{lottery_id}_draw_video")
    result.draw_video_url = url
    db.commit()
    db.refresh(result)
    return result


@router.post("/{lottery_id}/results/proof-images", response_model=DrawResultOut)
async def upload_proof_images(
    lottery_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    result = db.scalar(select(DrawResult).where(DrawResult.lottery_id == lottery_id))
    if not result:
        raise HTTPException(404, "Publish results first")
    urls = result.proof_image_urls or []
    for i, f in enumerate(files):
        content = await f.read()
        url = upload_image(content, folder="lottery/proof",
                           public_id=f"lottery_{lottery_id}_proof_{len(urls)+i}")
        urls.append(url)
    result.proof_image_urls = urls
    db.commit()
    db.refresh(result)
    return result


@router.get("/{lottery_id}/results", response_model=DrawResultOut)
def get_results(lottery_id: int, db: Session = Depends(get_db)):
    result = db.scalar(select(DrawResult).where(DrawResult.lottery_id == lottery_id))
    if not result:
        raise HTTPException(404, "Results not yet published")
    return result


@router.get("/{lottery_id}/winners")
def get_winners(lottery_id: int, db: Session = Depends(get_db)):
    result = db.scalar(select(DrawResult).where(DrawResult.lottery_id == lottery_id))
    if not result:
        raise HTTPException(404, "Results not yet published")
    winners = db.scalars(
        select(Ticket).where(
            Ticket.lottery_id == lottery_id,
            Ticket.status == TicketStatus.WON,
        )
    ).all()
    return [
        {"ticket_no": t.ticket_no, "user_id": t.user_id}
        for t in winners
    ]
