"""Payment gateway webhooks — Chapa and Telebirr."""
import logging
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi import Depends
from ..database import get_db
from ..payments import process_chapa_webhook, process_telebirr_webhook, verify_chapa_signature

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.post("/chapa")
async def chapa_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_chapa_signature: str | None = Header(default=None, alias="x-chapa-signature"),
):
    body_bytes = await request.body()

    # Verify HMAC signature
    if x_chapa_signature and not verify_chapa_signature(body_bytes, x_chapa_signature):
        logger.warning("Chapa webhook: invalid signature")
        raise HTTPException(400, "Invalid signature")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    logger.info("Chapa webhook received: %s", body.get("tx_ref"))

    # Process in background so we return 200 fast (Chapa retries on non-200)
    background_tasks.add_task(process_chapa_webhook, db, body)
    return {"status": "received"}


@router.post("/telebirr")
async def telebirr_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    logger.info("Telebirr webhook received: %s", body.get("outTradeNo"))
    # Production: decrypt body (AES-256-CBC) here before passing to processor
    background_tasks.add_task(process_telebirr_webhook, db, body)
    return {"status": "received"}
