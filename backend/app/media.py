"""Cloudinary upload helpers with local filesystem fallback.

If Cloudinary credentials are not configured or upload fails, files are saved
to the local /uploads directory and served directly by the backend API.
"""
import logging
import os
import re
import uuid
from pathlib import Path
import cloudinary
import cloudinary.uploader
from .config import settings

logger = logging.getLogger(__name__)

# Base directory for local uploads: backend/uploads
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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


def _guess_image_extension(data: bytes) -> str:
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    elif data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return ".gif"
    elif data.startswith(b"RIFF") and len(data) > 12 and data[8:12] == b"WEBP":
        return ".webp"
    elif b"<svg" in data[:200]:
        return ".svg"
    return ".jpg"


def _save_local_file(file_bytes: bytes, folder: str, filename_prefix: str | None, ext: str) -> str:
    clean_folder = folder.strip("/").replace("..", "")
    target_dir = UPLOAD_DIR / clean_folder
    target_dir.mkdir(parents=True, exist_ok=True)

    safe_prefix = re.sub(r"[^a-zA-Z0-9_\-]", "_", filename_prefix or "")
    if safe_prefix:
        fname = f"{safe_prefix}_{uuid.uuid4().hex[:6]}{ext}"
    else:
        fname = f"{uuid.uuid4().hex}{ext}"

    file_path = target_dir / fname
    file_path.write_bytes(file_bytes)
    return f"/uploads/{clean_folder}/{fname}"


def upload_image(
    file_bytes: bytes,
    folder: str = "lottery/images",
    public_id: str | None = None,
) -> str | None:
    """Upload an image to Cloudinary if configured; otherwise save to local /uploads."""
    if not file_bytes:
        return None

    if _is_configured():
        try:
            _configure()
            params: dict = {"folder": folder, "resource_type": "image"}
            if public_id:
                params["public_id"] = public_id
            result = cloudinary.uploader.upload(file_bytes, **params)
            return result["secure_url"]
        except Exception as exc:
            logger.warning("Cloudinary upload failed: %s; saving locally", exc)

    ext = _guess_image_extension(file_bytes)
    return _save_local_file(file_bytes, folder, public_id, ext)


def upload_video(
    file_bytes: bytes,
    folder: str = "lottery/videos",
    public_id: str | None = None,
) -> str | None:
    """Upload a video to Cloudinary if configured; otherwise save to local /uploads."""
    if not file_bytes:
        return None

    if _is_configured():
        try:
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
        except Exception as exc:
            logger.warning("Cloudinary video upload failed: %s; saving locally", exc)

    return _save_local_file(file_bytes, folder, public_id, ".mp4")

