"""Cloudinary upload helpers.

If Cloudinary credentials are not set in the environment, upload attempts
return None (image upload is optional). The caller decides what to do.
"""
import logging
import cloudinary
import cloudinary.uploader
from .config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(
    file_bytes: bytes,
    folder: str = "lottery/images",
    public_id: str | None = None,
) -> str | None:
    """Upload an image. Returns URL on success, None if Cloudinary not configured."""
    if not _is_configured():
        logger.warning("Cloudinary not configured — image upload skipped")
        return None
    _configure()
    params: dict = {"folder": folder, "resource_type": "image"}
    if public_id:
        params["public_id"] = public_id
    result = cloudinary.uploader.upload(file_bytes, **params)
    return result["secure_url"]


def upload_video(
    file_bytes: bytes,
    folder: str = "lottery/videos",
    public_id: str | None = None,
) -> str | None:
    """Upload a video. Returns URL on success, None if Cloudinary not configured."""
    if not _is_configured():
        logger.warning("Cloudinary not configured — video upload skipped")
        return None
    _configure()
    params: dict = {
        "folder": folder,
        "resource_type": "video",
        "chunk_size": 6_000_000,
    }
    if public_id:
        params["public_id"] = public_id
    result = cloudinary.uploader.upload(file_bytes, **params)
    return result["secure_url"]
