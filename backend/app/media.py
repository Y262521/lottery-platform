"""Cloudinary upload helpers."""
import cloudinary
import cloudinary.uploader
from .config import settings


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(file_bytes: bytes, folder: str = "lottery/images", public_id: str | None = None) -> str:
    """Upload an image to Cloudinary and return its secure URL."""
    _configure()
    params: dict = {"folder": folder, "resource_type": "image"}
    if public_id:
        params["public_id"] = public_id
    result = cloudinary.uploader.upload(file_bytes, **params)
    return result["secure_url"]


def upload_video(file_bytes: bytes, folder: str = "lottery/videos", public_id: str | None = None) -> str:
    """Upload a video to Cloudinary and return its secure URL."""
    _configure()
    params: dict = {
        "folder": folder,
        "resource_type": "video",
        "chunk_size": 6_000_000,  # 6 MB chunks for large videos
    }
    if public_id:
        params["public_id"] = public_id
    result = cloudinary.uploader.upload(file_bytes, **params)
    return result["secure_url"]
